-- =============================================================
-- MODULE 10: Triggers & Functions — Document Management
-- =============================================================

CREATE TRIGGER trg_drwf_updated_at
  BEFORE UPDATE ON document_review_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- SUBMIT DOCUMENT VERSION FOR REVIEW
-- Called by the app when an author submits their draft.
-- Creates a pending review row for each workflow step and
-- advances the document version status.
-- =============================================================

CREATE OR REPLACE FUNCTION submit_document_for_review(
  p_document_id uuid,
  p_version_id  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_doc      record;
  v_step     record;
  v_workflow_id uuid;
BEGIN
  SELECT d.*, dv.status AS ver_status
  INTO v_doc
  FROM documents d
  LEFT JOIN document_versions dv ON dv.id = p_version_id
  WHERE d.id = p_document_id;

  v_workflow_id := v_doc.review_workflow_id;

  IF v_workflow_id IS NULL THEN
    -- No workflow — auto-approve
    UPDATE document_versions
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = p_version_id;
    RETURN;
  END IF;

  -- Update version status
  UPDATE document_versions
  SET status = 'in_review', submitted_for_review_at = now(), submitted_by = auth.uid()
  WHERE id = p_version_id;

  -- Create a pending review record for each step
  FOR v_step IN
    SELECT * FROM document_review_workflow_steps WHERE workflow_id = v_workflow_id ORDER BY order_index
  LOOP
    INSERT INTO document_version_reviews (
      document_id, version_id, workflow_step_id, organisation_id,
      reviewer_id, decision
    ) VALUES (
      p_document_id, p_version_id, v_step.id, v_doc.organisation_id,
      v_step.assigned_user_id, 'pending'
    )
    ON CONFLICT (version_id, workflow_step_id) DO NOTHING;

    -- Notify the reviewer
    PERFORM create_notification(
      'documents.review_requested', v_doc.organisation_id, NULL,
      'document', p_document_id,
      jsonb_build_object(
        'document_title', v_doc.title,
        'step_name',      v_step.step_name,
        'reporter_id',    v_step.assigned_user_id
      )
    );
  END LOOP;
END;
$$;

-- =============================================================
-- REVIEW DECISION HANDLER
-- When a reviewer approves/rejects their step, check if all
-- steps are complete. If all approved → mark version approved.
-- If any rejection → mark version rejected, notify author.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_document_review_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_all_approved  boolean;
  v_any_rejected  boolean;
  v_doc           record;
BEGIN
  IF OLD.decision = NEW.decision THEN RETURN NEW; END IF;

  NEW.decided_at := now();
  NEW.reviewer_id := COALESCE(NEW.reviewer_id, auth.uid());

  SELECT * INTO v_doc FROM documents WHERE id = NEW.document_id;

  IF NEW.decision = 'rejected' THEN
    UPDATE document_versions SET status = 'rejected', rejection_notes = NEW.decision_notes WHERE id = NEW.version_id;
    PERFORM create_notification(
      'documents.review_rejected', v_doc.organisation_id, NULL,
      'document', NEW.document_id,
      jsonb_build_object('document_title', v_doc.title, 'rejection_notes', NEW.decision_notes, 'reporter_id', v_doc.created_by)
    );
    RETURN NEW;
  END IF;

  IF NEW.decision = 'approved' THEN
    -- Check all required steps are approved
    SELECT
      BOOL_AND(CASE WHEN ws.is_required THEN dvr.decision = 'approved' ELSE true END),
      BOOL_OR(dvr.decision = 'rejected')
    INTO v_all_approved, v_any_rejected
    FROM document_review_workflow_steps ws
    LEFT JOIN document_version_reviews dvr
      ON dvr.workflow_step_id = ws.id AND dvr.version_id = NEW.version_id
    WHERE ws.workflow_id = (
      SELECT workflow_id FROM document_review_workflow_steps WHERE id = NEW.workflow_step_id
    );

    IF v_all_approved AND NOT COALESCE(v_any_rejected, false) THEN
      UPDATE document_versions
      SET status = 'approved', approved_by = auth.uid(), approved_at = now()
      WHERE id = NEW.version_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_review_decision
  BEFORE UPDATE OF decision ON document_version_reviews
  FOR EACH ROW EXECUTE FUNCTION handle_document_review_decision();

-- =============================================================
-- PUBLISH DOCUMENT VERSION
-- RPC: marks a version as published, archives the previous
-- version, sets document.published_at, fires notifications
-- to users who have pending acknowledgement requirements.
-- =============================================================

CREATE OR REPLACE FUNCTION publish_document_version(
  p_document_id uuid,
  p_version_id  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_doc        record;
  v_published_status_id uuid;
  v_archived_status_id  uuid;
BEGIN
  IF NOT (is_hse_officer() OR is_system_admin()) THEN
    RAISE EXCEPTION 'Insufficient permission to publish documents';
  END IF;

  SELECT * INTO v_doc FROM documents WHERE id = p_document_id;

  -- Archive previous current version
  UPDATE document_versions SET status = 'archived', is_current = false
  WHERE document_id = p_document_id AND is_current = true AND id != p_version_id;

  -- Publish new version
  UPDATE document_versions
  SET status = 'published', is_current = true
  WHERE id = p_version_id;

  -- Update document metadata
  UPDATE documents
  SET current_version_id = p_version_id,
      published_at       = now(),
      published_by       = auth.uid(),
      updated_at         = now()
  WHERE id = p_document_id;

  -- Notify users with acknowledgement requirements
  IF v_doc.requires_acknowledgement THEN
    PERFORM create_notification(
      'documents.acknowledgement_required',
      v_doc.organisation_id, NULL,
      'document', p_document_id,
      jsonb_build_object('document_title', v_doc.title)
    );
  END IF;
END;
$$;

-- =============================================================
-- REVIEW CYCLE DUE DATE TRACKING
-- =============================================================

CREATE OR REPLACE FUNCTION set_document_review_due_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.review_cycle_days IS NOT NULL AND NEW.published_at IS NOT NULL
     AND (OLD.published_at IS NULL OR OLD.published_at != NEW.published_at)
  THEN
    NEW.review_due_date := NEW.published_at::date + NEW.review_cycle_days;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_document_review_due
  BEFORE UPDATE OF published_at, review_cycle_days ON documents
  FOR EACH ROW EXECUTE FUNCTION set_document_review_due_date();

-- =============================================================
-- DOCUMENT EXPIRY NOTIFICATIONS — daily sweep
-- =============================================================

CREATE OR REPLACE FUNCTION notify_expiring_documents(p_days_ahead integer DEFAULT 30)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer := 0; v_doc record;
BEGIN
  FOR v_doc IN
    SELECT d.id, d.organisation_id, d.title, d.expires_at
    FROM documents d
    WHERE d.expires_at BETWEEN now() AND now() + (p_days_ahead || ' days')::interval
      AND d.is_active = true
  LOOP
    PERFORM create_notification(
      'documents.expiring_soon', v_doc.organisation_id, NULL,
      'document', v_doc.id,
      jsonb_build_object('document_title', v_doc.title, 'expiry_date', v_doc.expires_at::text)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
