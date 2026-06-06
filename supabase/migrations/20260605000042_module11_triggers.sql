-- =============================================================
-- MODULE 11: Triggers & Functions — Permit to Work
-- =============================================================

CREATE TRIGGER trg_permits_updated_at
  BEFORE UPDATE ON permits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_permit_isolation_certs_updated_at
  BEFORE UPDATE ON permit_isolation_certs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- PERMIT NUMBER — PTW-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION generate_permit_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.permit_number IS NULL THEN
    NEW.permit_number := next_reference_number('permit', NEW.organisation_id, 'PTW');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_permit_number
  BEFORE INSERT ON permits FOR EACH ROW EXECUTE FUNCTION generate_permit_number();

-- =============================================================
-- PERMIT STATUS CHANGE NOTIFICATIONS
-- Fires notifications at key lifecycle transitions.
-- =============================================================

CREATE OR REPLACE FUNCTION notify_permit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status_code text;
  v_site_name   text;
BEGIN
  IF OLD.status_id = NEW.status_id THEN RETURN NEW; END IF;

  SELECT ps.code INTO v_status_code FROM permit_statuses ps WHERE ps.id = NEW.status_id;
  SELECT s.name  INTO v_site_name   FROM sites s WHERE s.id = NEW.site_id;

  CASE v_status_code
    WHEN 'submitted' THEN
      -- Notify approvers
      PERFORM create_notification(
        'permits.approval_required', NEW.organisation_id, NEW.site_id,
        'permit', NEW.id,
        jsonb_build_object(
          'permit_number', NEW.permit_number, 'permit_title', NEW.title,
          'site_name', COALESCE(v_site_name,''), 'reporter_id', NEW.applicant_id
        )
      );

    WHEN 'approved' THEN
      PERFORM create_notification(
        'permits.approved', NEW.organisation_id, NEW.site_id,
        'permit', NEW.id,
        jsonb_build_object(
          'permit_number', NEW.permit_number, 'permit_title', NEW.title,
          'reporter_id', NEW.applicant_id
        )
      );

    WHEN 'rejected' THEN
      PERFORM create_notification(
        'permits.rejected', NEW.organisation_id, NEW.site_id,
        'permit', NEW.id,
        jsonb_build_object(
          'permit_number', NEW.permit_number, 'permit_title', NEW.title,
          'reporter_id', NEW.applicant_id
        )
      );

    WHEN 'expired' THEN
      PERFORM create_notification(
        'permits.expired', NEW.organisation_id, NEW.site_id,
        'permit', NEW.id,
        jsonb_build_object(
          'permit_number', NEW.permit_number, 'permit_title', NEW.title,
          'reporter_id', NEW.responsible_person_id
        )
      );

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_permit_status
  AFTER UPDATE OF status_id ON permits
  FOR EACH ROW EXECUTE FUNCTION notify_permit_status_change();

-- =============================================================
-- APPROVAL CHAIN PROGRESSION
-- When an approval step decision is recorded, check if all
-- required steps are approved. If so, advance the permit status
-- to the next stage. If any step is rejected, reject the permit.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_permit_approval_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_all_approved   boolean;
  v_any_rejected   boolean;
  v_approved_id    uuid;
  v_rejected_id    uuid;
  v_issued_id      uuid;
BEGIN
  IF OLD.decision = NEW.decision THEN RETURN NEW; END IF;

  NEW.decided_at := now();
  NEW.approver_id := COALESCE(NEW.approver_id, auth.uid());

  SELECT id INTO v_approved_id FROM permit_statuses WHERE code = 'approved' LIMIT 1;
  SELECT id INTO v_rejected_id FROM permit_statuses WHERE code = 'rejected' LIMIT 1;
  SELECT id INTO v_issued_id   FROM permit_statuses WHERE code = 'issued'   LIMIT 1;

  SELECT
    BOOL_AND(decision = 'approved'),
    BOOL_OR(decision = 'rejected')
  INTO v_all_approved, v_any_rejected
  FROM permit_approvals
  WHERE permit_id = NEW.permit_id;

  IF COALESCE(v_any_rejected, false) THEN
    UPDATE permits SET status_id = v_rejected_id, updated_at = now() WHERE id = NEW.permit_id;
  ELSIF COALESCE(v_all_approved, false) THEN
    -- All steps done → advance to approved, then issued
    UPDATE permits
    SET status_id  = COALESCE(v_issued_id, v_approved_id),
        updated_at = now()
    WHERE id = NEW.permit_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_permit_approval
  BEFORE UPDATE OF decision ON permit_approvals
  FOR EACH ROW EXECUTE FUNCTION handle_permit_approval_decision();

-- =============================================================
-- AUTO-EXPIRE PERMITS — called daily by pg_cron
-- =============================================================

CREATE OR REPLACE FUNCTION mark_expired_permits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count     integer;
  v_active_ids uuid[];
  v_expired_id uuid;
BEGIN
  -- Get status IDs for active states and expired
  SELECT ARRAY_AGG(id) INTO v_active_ids FROM permit_statuses WHERE is_active_work = true;
  SELECT id INTO v_expired_id FROM permit_statuses WHERE code = 'expired' LIMIT 1;

  UPDATE permits
  SET status_id  = v_expired_id,
      updated_at = now()
  WHERE status_id = ANY(v_active_ids)
    AND valid_until < now()
    AND v_expired_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================
-- PERMIT WORK COMPLETION TIMESTAMPS
-- =============================================================

CREATE OR REPLACE FUNCTION stamp_permit_workflow_times()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status_code text;
BEGIN
  SELECT code INTO v_status_code FROM permit_statuses WHERE id = NEW.status_id;

  IF v_status_code = 'work_completed' AND OLD.status_id != NEW.status_id THEN
    NEW.work_completed_by := COALESCE(NEW.work_completed_by, auth.uid());
    NEW.work_completed_at := COALESCE(NEW.work_completed_at, now());
    NEW.actual_end        := COALESCE(NEW.actual_end, now());
  END IF;

  IF v_status_code = 'active' AND OLD.status_id != NEW.status_id THEN
    NEW.actual_start := COALESCE(NEW.actual_start, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_permit_workflow
  BEFORE UPDATE OF status_id ON permits
  FOR EACH ROW EXECUTE FUNCTION stamp_permit_workflow_times();

-- Row versioning
CREATE TRIGGER version_permits
  AFTER INSERT OR UPDATE OR DELETE ON permits
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();
