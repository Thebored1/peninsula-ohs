-- =============================================================
-- MODULE 5: Triggers & Functions — CAPA Engine
-- =============================================================

-- =============================================================
-- UPDATED_AT HOUSEKEEPING
-- =============================================================

CREATE TRIGGER trg_actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_action_extensions_updated_at
  BEFORE UPDATE ON action_extensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- ACTION NUMBER — BEFORE INSERT
-- Format: ACT-YYYY-NNNNN (org-scoped, resets each year)
-- =============================================================

CREATE OR REPLACE FUNCTION generate_action_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.action_number IS NULL THEN
    NEW.action_number := next_reference_number('action', NEW.organisation_id, 'ACT');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_action_number
  BEFORE INSERT ON actions
  FOR EACH ROW EXECUTE FUNCTION generate_action_number();

-- =============================================================
-- OVERDUE CHECK
-- BEFORE INSERT OR UPDATE: if due_date (or extended_due_date) is
-- in the past and the action is not yet complete, mark overdue.
-- Uses extended_due_date when present so approved extensions
-- correctly reset the overdue flag.
-- =============================================================

CREATE OR REPLACE FUNCTION check_action_overdue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_effective_due date;
BEGIN
  v_effective_due := COALESCE(NEW.extended_due_date, NEW.due_date);

  IF v_effective_due IS NOT NULL
     AND v_effective_due < CURRENT_DATE
     AND NEW.status IN ('open', 'in_progress', 'reopened')
  THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_action_overdue
  BEFORE INSERT OR UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION check_action_overdue();

-- =============================================================
-- WORKFLOW TIMESTAMPS
-- BEFORE UPDATE: auto-stamp completed_at, verified_at on
-- status transitions. Also records assigned_at when assigned_to
-- is first set.
-- =============================================================

CREATE OR REPLACE FUNCTION stamp_action_workflow_times()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Record initial assignment time
  IF NEW.assigned_to IS NOT NULL
     AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
     AND NEW.assigned_at IS NULL
  THEN
    NEW.assigned_at := now();
    NEW.assigned_by := COALESCE(NEW.assigned_by, auth.uid());
  END IF;

  -- Completion timestamp
  IF NEW.status IN ('completed','verification_pending')
     AND OLD.status NOT IN ('completed','verification_pending','verified','closed')
  THEN
    NEW.completed_at  := COALESCE(NEW.completed_at, now());
    NEW.completed_by  := COALESCE(NEW.completed_by, auth.uid());
  END IF;

  -- Verification timestamp
  IF NEW.status IN ('verified','closed')
     AND OLD.status NOT IN ('verified','closed')
  THEN
    NEW.verified_at := COALESCE(NEW.verified_at, now());
    NEW.verified_by := COALESCE(NEW.verified_by, auth.uid());
  END IF;

  -- Clear completion timestamps when reopened
  IF NEW.status = 'reopened' AND OLD.status != 'reopened' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
    NEW.verified_at  := NULL;
    NEW.verified_by  := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_action_workflow
  BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION stamp_action_workflow_times();

-- =============================================================
-- STATUS CHANGE AUDIT COMMENT
-- AFTER UPDATE OF status: auto-inserts a system comment for
-- every status transition and fires the relevant notification.
-- =============================================================

CREATE OR REPLACE FUNCTION track_action_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_name text;
  v_comment    text;
  v_event      text;
  v_data       jsonb;
  v_site_name  text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Resolve actor name for the comment
  SELECT display_name INTO v_actor_name
  FROM user_profiles WHERE id = auth.uid();
  v_actor_name := COALESCE(v_actor_name, 'System');

  -- Build a human-readable comment for the transition
  v_comment := 'Status changed from ' || OLD.status || ' to ' || NEW.status
               || ' by ' || v_actor_name || '.';

  CASE NEW.status
    WHEN 'completed'           THEN v_comment := v_actor_name || ' marked this action as completed.';
    WHEN 'verification_pending'THEN v_comment := v_actor_name || ' submitted this action for verification.';
    WHEN 'verified'            THEN v_comment := v_actor_name || ' verified and accepted this action.';
    WHEN 'closed'              THEN v_comment := v_actor_name || ' closed this action.';
    WHEN 'reopened'            THEN v_comment := v_actor_name || ' rejected verification and reopened this action.'
                                                 || CASE WHEN NEW.rejection_reason IS NOT NULL
                                                         THEN ' Reason: ' || NEW.rejection_reason
                                                         ELSE '' END;
    WHEN 'overdue'             THEN v_comment := 'Action became overdue (due ' || COALESCE(NEW.due_date::text, 'unknown') || ').';
    WHEN 'cancelled'           THEN v_comment := v_actor_name || ' cancelled this action.';
    ELSE NULL;
  END CASE;

  INSERT INTO action_comments (action_id, organisation_id, user_id, comment_type, body)
  VALUES (NEW.id, NEW.organisation_id, auth.uid(), 'status_change', v_comment);

  -- Notification events
  SELECT name INTO v_site_name FROM sites WHERE id = NEW.site_id;

  v_data := jsonb_build_object(
    'action_number',    NEW.action_number,
    'action_title',     NEW.title,
    'site_name',        COALESCE(v_site_name, ''),
    'priority',         NEW.priority,
    'due_date',         COALESCE(NEW.due_date::text, ''),
    'reporter_id',      NEW.assigned_to,
    'source_reference', COALESCE(NEW.source_reference, '')
  );

  CASE NEW.status
    WHEN 'verification_pending' THEN
      PERFORM create_notification(
        'actions.verification_required', NEW.organisation_id, NEW.site_id,
        'action', NEW.id,
        v_data || jsonb_build_object('reporter_id', NEW.verification_assigned_to)
      );

    WHEN 'reopened' THEN
      PERFORM create_notification(
        'actions.rejected_and_reopened', NEW.organisation_id, NEW.site_id,
        'action', NEW.id, v_data
      );

    WHEN 'overdue' THEN
      PERFORM create_notification(
        'incidents.action_overdue', NEW.organisation_id, NEW.site_id,
        'action', NEW.id, v_data
      );

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_action_status
  AFTER UPDATE OF status ON actions
  FOR EACH ROW EXECUTE FUNCTION track_action_status_change();

-- =============================================================
-- REASSIGNMENT LOG
-- AFTER UPDATE OF assigned_to: inserts into action_assignments
-- and auto-posts a comment so the audit trail is complete.
-- =============================================================

CREATE OR REPLACE FUNCTION log_action_reassignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_name text;
  v_to_name   text;
BEGIN
  IF OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN RETURN NEW; END IF;

  INSERT INTO action_assignments (
    action_id, organisation_id,
    assigned_from, assigned_to, assigned_by,
    notes
  ) VALUES (
    NEW.id, NEW.organisation_id,
    OLD.assigned_to, NEW.assigned_to, auth.uid(),
    NULL
  );

  SELECT display_name INTO v_from_name FROM user_profiles WHERE id = OLD.assigned_to;
  SELECT display_name INTO v_to_name   FROM user_profiles WHERE id = NEW.assigned_to;

  INSERT INTO action_comments (action_id, organisation_id, user_id, comment_type, body)
  VALUES (
    NEW.id, NEW.organisation_id, auth.uid(), 'reassignment',
    'Action reassigned from '
    || COALESCE(v_from_name, 'unassigned')
    || ' to ' || COALESCE(v_to_name, 'unassigned') || '.'
  );

  -- Notify new assignee
  PERFORM create_notification(
    'actions.assigned',
    NEW.organisation_id, NEW.site_id,
    'action', NEW.id,
    jsonb_build_object(
      'action_number',    NEW.action_number,
      'action_title',     NEW.title,
      'due_date',         COALESCE(NEW.due_date::text, 'not set'),
      'source_reference', COALESCE(NEW.source_reference, ''),
      'reporter_id',      NEW.assigned_to
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_action_reassignment
  AFTER UPDATE OF assigned_to ON actions
  FOR EACH ROW EXECUTE FUNCTION log_action_reassignment();

-- =============================================================
-- INITIAL ASSIGNMENT LOG — fire on first INSERT with assigned_to
-- =============================================================

CREATE OR REPLACE FUNCTION log_initial_action_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;

  INSERT INTO action_assignments (
    action_id, organisation_id,
    assigned_from, assigned_to, assigned_by
  ) VALUES (
    NEW.id, NEW.organisation_id,
    NULL, NEW.assigned_to, auth.uid()
  );

  PERFORM create_notification(
    'actions.assigned',
    NEW.organisation_id, NEW.site_id,
    'action', NEW.id,
    jsonb_build_object(
      'action_number',    NEW.action_number,
      'action_title',     NEW.title,
      'due_date',         COALESCE(NEW.due_date::text, 'not set'),
      'source_reference', COALESCE(NEW.source_reference, ''),
      'reporter_id',      NEW.assigned_to
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_initial_action_assignment
  AFTER INSERT ON actions
  FOR EACH ROW EXECUTE FUNCTION log_initial_action_assignment();

-- =============================================================
-- EXTENSION DECISION HANDLER
-- AFTER UPDATE ON action_extensions: when an extension is
-- approved, update the parent action's extended_due_date and
-- reset overdue status. Either way, post a comment.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_extension_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reviewer_name  text;
  v_comment        text;
  v_data           jsonb;
BEGIN
  IF OLD.status = NEW.status OR NEW.status = 'pending' THEN RETURN NEW; END IF;

  NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());

  SELECT display_name INTO v_reviewer_name FROM user_profiles WHERE id = NEW.reviewed_by;

  IF NEW.status = 'approved' THEN
    -- Update action's extended due date and reset overdue status
    UPDATE actions
    SET extended_due_date = NEW.requested_new_due_date,
        status = CASE WHEN status = 'overdue' THEN 'in_progress' ELSE status END,
        updated_at = now()
    WHERE id = NEW.action_id;

    v_comment := COALESCE(v_reviewer_name, 'Reviewer') || ' approved the extension request.'
                 || ' New due date: ' || NEW.requested_new_due_date::text || '.'
                 || CASE WHEN NEW.review_notes IS NOT NULL THEN ' Note: ' || NEW.review_notes ELSE '' END;

    PERFORM create_notification(
      'actions.extension_approved',
      NEW.organisation_id,
      (SELECT site_id FROM actions WHERE id = NEW.action_id),
      'action', NEW.action_id,
      jsonb_build_object(
        'action_number',     (SELECT action_number FROM actions WHERE id = NEW.action_id),
        'action_title',      (SELECT title FROM actions WHERE id = NEW.action_id),
        'new_due_date',      NEW.requested_new_due_date::text,
        'reporter_id',       NEW.requested_by
      )
    );

  ELSIF NEW.status = 'rejected' THEN
    v_comment := COALESCE(v_reviewer_name, 'Reviewer') || ' rejected the extension request.'
                 || CASE WHEN NEW.review_notes IS NOT NULL THEN ' Reason: ' || NEW.review_notes ELSE '' END;

    PERFORM create_notification(
      'actions.extension_rejected',
      NEW.organisation_id,
      (SELECT site_id FROM actions WHERE id = NEW.action_id),
      'action', NEW.action_id,
      jsonb_build_object(
        'action_number',  (SELECT action_number FROM actions WHERE id = NEW.action_id),
        'action_title',   (SELECT title FROM actions WHERE id = NEW.action_id),
        'reporter_id',    NEW.requested_by
      )
    );
  END IF;

  INSERT INTO action_comments (action_id, organisation_id, user_id, comment_type, body)
  VALUES (
    NEW.action_id, NEW.organisation_id, auth.uid(),
    'extension_response', v_comment
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_extension_decision
  BEFORE UPDATE OF status ON action_extensions
  FOR EACH ROW EXECUTE FUNCTION handle_extension_decision();

-- =============================================================
-- EXTENSION REQUEST COMMENT
-- AFTER INSERT on action_extensions: auto-post comment on parent action.
-- =============================================================

CREATE OR REPLACE FUNCTION log_extension_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_requester_name text;
BEGIN
  SELECT display_name INTO v_requester_name FROM user_profiles WHERE id = NEW.requested_by;

  INSERT INTO action_comments (action_id, organisation_id, user_id, comment_type, body)
  VALUES (
    NEW.action_id, NEW.organisation_id, NEW.requested_by,
    'extension_request',
    COALESCE(v_requester_name, 'User') || ' requested an extension to '
    || NEW.requested_new_due_date::text || '. Reason: ' || NEW.reason
  );

  -- Notify supervisor / HSE
  PERFORM create_notification(
    'actions.extension_requested',
    NEW.organisation_id,
    (SELECT site_id FROM actions WHERE id = NEW.action_id),
    'action', NEW.action_id,
    jsonb_build_object(
      'action_number',     (SELECT action_number FROM actions WHERE id = NEW.action_id),
      'action_title',      (SELECT title FROM actions WHERE id = NEW.action_id),
      'requester_name',    COALESCE(v_requester_name, 'User'),
      'requested_date',    NEW.requested_new_due_date::text,
      'reason',            NEW.reason
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_extension_request
  AFTER INSERT ON action_extensions
  FOR EACH ROW EXECUTE FUNCTION log_extension_request();

-- =============================================================
-- ROW VERSIONING
-- =============================================================

CREATE TRIGGER version_actions
  AFTER INSERT OR UPDATE OR DELETE ON actions
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

-- =============================================================
-- BULK CLOSE FUNCTION
-- Closes multiple actions at once. Accepts an array of action IDs
-- and an optional shared note. Only closes actions in terminal-
-- eligible statuses (verified, or completed if no verification).
-- Returns the count of actions actually closed.
-- =============================================================

CREATE OR REPLACE FUNCTION bulk_close_actions(
  p_action_ids uuid[],
  p_note       text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count  integer;
  v_org_id uuid;
BEGIN
  -- All actions must belong to the caller's org
  UPDATE actions
  SET status        = 'closed',
      is_bulk_closed= true,
      bulk_close_note = p_note,
      updated_at    = now()
  WHERE id = ANY(p_action_ids)
    AND organisation_id = get_my_organisation_id()
    AND status IN ('verified', 'completed')  -- only these can be bulk-closed
    AND (
      is_system_admin() OR is_hse_officer()
      OR (is_supervisor() AND can_access_site(site_id))
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================
-- BULK OVERDUE SWEEP — called by pg_cron daily
-- =============================================================

CREATE OR REPLACE FUNCTION mark_overdue_actions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE actions
  SET status     = 'overdue',
      updated_at = now()
  WHERE COALESCE(extended_due_date, due_date) < CURRENT_DATE
    AND status IN ('open', 'in_progress', 'reopened');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================
-- UTILITY: get_my_actions()
-- Returns current user's open/overdue actions for the inbox.
-- =============================================================

CREATE OR REPLACE FUNCTION get_my_actions()
RETURNS TABLE (
  id             uuid,
  action_number  text,
  title          text,
  priority       text,
  status         action_status_enum,
  source_type    text,
  source_reference text,
  due_date       date,
  extended_due_date date,
  is_overdue     boolean,
  days_overdue   integer
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    id,
    action_number,
    title,
    priority,
    status,
    source_type,
    source_reference,
    due_date,
    extended_due_date,
    (COALESCE(extended_due_date, due_date) < CURRENT_DATE) AS is_overdue,
    GREATEST(0, (CURRENT_DATE - COALESCE(extended_due_date, due_date))::integer) AS days_overdue
  FROM actions
  WHERE assigned_to = auth.uid()
    AND status NOT IN ('closed','cancelled','verified')
  ORDER BY
    CASE priority
      WHEN 'critical' THEN 1
      WHEN 'high'     THEN 2
      WHEN 'medium'   THEN 3
      WHEN 'low'      THEN 4
    END,
    COALESCE(extended_due_date, due_date) ASC NULLS LAST;
$$;
