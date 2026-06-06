-- =============================================================
-- MODULE 6: Triggers & Functions — Inspection Engine
-- =============================================================

-- =============================================================
-- UPDATED_AT HOUSEKEEPING
-- =============================================================

CREATE TRIGGER trg_inspection_templates_updated_at
  BEFORE UPDATE ON inspection_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_template_questions_updated_at
  BEFORE UPDATE ON inspection_template_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_schedules_updated_at
  BEFORE UPDATE ON inspection_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_responses_updated_at
  BEFORE UPDATE ON inspection_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- INSPECTION NUMBER — BEFORE INSERT
-- Format: INSP-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION generate_inspection_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inspection_number IS NULL THEN
    NEW.inspection_number := next_reference_number('inspection', NEW.organisation_id, 'INSP');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_inspection_number
  BEFORE INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION generate_inspection_number();

-- =============================================================
-- SNAPSHOT TEMPLATE METADATA ON INSPECTION START
-- BEFORE INSERT on inspections: copy template version and
-- question/section counts from the template.
-- =============================================================

CREATE OR REPLACE FUNCTION snapshot_inspection_template()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Capture template version at time of creation
  SELECT version, inspection_type_id
  INTO NEW.template_version, NEW.inspection_type_id
  FROM inspection_templates
  WHERE id = NEW.template_id;

  -- Count active questions for progress tracking
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_required = true)
  INTO NEW.total_questions, NEW.required_questions
  FROM inspection_template_questions
  WHERE template_id = NEW.template_id AND is_active = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_inspection_template
  BEFORE INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION snapshot_inspection_template();

-- =============================================================
-- INSPECTION RESPONSE — COMPUTE is_failed
-- BEFORE INSERT OR UPDATE on inspection_responses.
-- Evaluates the response_value against the question's
-- fail_condition to determine whether this answer is a failure.
-- =============================================================

CREATE OR REPLACE FUNCTION compute_response_is_failed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  q record;
  v_min  decimal;
  v_max  decimal;
BEGIN
  -- Not applicable responses are never failed
  IF NEW.is_na THEN
    NEW.is_failed := false;
    RETURN NEW;
  END IF;

  SELECT question_type, fail_condition, is_scored
  INTO q
  FROM inspection_template_questions
  WHERE id = NEW.question_id;

  NEW.is_failed := false;  -- default safe

  CASE q.question_type
    WHEN 'pass_fail' THEN
      NEW.is_failed := (NEW.response_value = 'fail');

    WHEN 'yes_no' THEN
      -- Failed if answered 'no' and the question is configured to fail on 'no'
      NEW.is_failed := (
        NEW.response_value = 'no'
        AND COALESCE(q.fail_condition->>'fail_on', 'no') = 'no'
      );

    WHEN 'numeric' THEN
      IF NEW.response_numeric IS NOT NULL AND q.fail_condition IS NOT NULL THEN
        v_min := (q.fail_condition->>'min')::decimal;
        v_max := (q.fail_condition->>'max')::decimal;
        NEW.is_failed := (
          (v_min IS NOT NULL AND NEW.response_numeric < v_min)
          OR (v_max IS NOT NULL AND NEW.response_numeric > v_max)
        );
      END IF;

    WHEN 'multiple_choice' THEN
      IF NEW.response_value IS NOT NULL
         AND q.fail_condition IS NOT NULL
         AND q.fail_condition ? 'fail_values'
      THEN
        NEW.is_failed := NEW.response_value = ANY(
          ARRAY(SELECT jsonb_array_elements_text(q.fail_condition->'fail_values'))
        );
      END IF;

    ELSE
      -- photo, signature, text, date_time: never auto-failed by value
      NEW.is_failed := false;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_response_is_failed
  BEFORE INSERT OR UPDATE ON inspection_responses
  FOR EACH ROW EXECUTE FUNCTION compute_response_is_failed();

-- =============================================================
-- INSPECTION SCORE + PROGRESS — AFTER INSERT/UPDATE on responses
-- Recalculates and pushes score, answered_questions, and
-- failed_questions back onto the parent inspections row.
-- Score formula:
--   passed_weight / answered_non_na_weight * 100
-- Only questions with is_scored=true contribute.
-- =============================================================

CREATE OR REPLACE FUNCTION recalculate_inspection_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_q      integer;
  v_answered_q   integer;
  v_failed_q     integer;
  v_passed_w     decimal;
  v_answered_w   decimal;
  v_score        decimal;
  v_result       inspection_result_enum;
  v_threshold    decimal;
BEGIN
  -- Aggregate response stats for this inspection
  SELECT
    COUNT(*)                              FILTER (WHERE ir.response_value IS NOT NULL OR ir.response_numeric IS NOT NULL OR ir.response_date IS NOT NULL OR ir.is_na),
    COUNT(*)                              FILTER (WHERE ir.is_failed = true),
    SUM(q.weight)                         FILTER (WHERE q.is_scored AND NOT ir.is_na AND (ir.response_value IS NOT NULL OR ir.response_numeric IS NOT NULL)),
    SUM(q.weight)                         FILTER (WHERE q.is_scored AND NOT ir.is_na AND NOT ir.is_failed AND (ir.response_value IS NOT NULL OR ir.response_numeric IS NOT NULL))
  INTO v_answered_q, v_failed_q, v_answered_w, v_passed_w
  FROM inspection_responses ir
  JOIN inspection_template_questions q ON q.id = ir.question_id
  WHERE ir.inspection_id = NEW.inspection_id;

  -- Score is null if nothing has been scored yet
  IF COALESCE(v_answered_w, 0) > 0 THEN
    v_score := ROUND((COALESCE(v_passed_w, 0) / v_answered_w) * 100, 2);
  ELSE
    v_score := NULL;
  END IF;

  -- Get threshold
  SELECT it.passing_score_threshold INTO v_threshold
  FROM inspections i
  JOIN inspection_templates it ON it.id = i.template_id
  WHERE i.id = NEW.inspection_id;

  -- Derive result (only meaningful when inspection is complete)
  IF v_score IS NOT NULL THEN
    IF v_score >= COALESCE(v_threshold, 80) THEN
      v_result := CASE WHEN v_failed_q > 0 THEN 'conditional_pass' ELSE 'pass' END;
    ELSE
      v_result := 'fail';
    END IF;
  END IF;

  UPDATE inspections
  SET answered_questions = COALESCE(v_answered_q, 0),
      failed_questions   = COALESCE(v_failed_q, 0),
      score              = v_score,
      result             = v_result,
      updated_at         = now()
  WHERE id = NEW.inspection_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalculate_inspection_score
  AFTER INSERT OR UPDATE ON inspection_responses
  FOR EACH ROW EXECUTE FUNCTION recalculate_inspection_score();

-- =============================================================
-- SCORE THRESHOLD NOTIFICATION
-- AFTER UPDATE OF score on inspections: if score drops below
-- the template threshold, notify the assigned supervisor/HSE.
-- =============================================================

CREATE OR REPLACE FUNCTION check_inspection_score_threshold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_threshold  decimal;
  v_site_name  text;
  v_tmpl_name  text;
BEGIN
  IF NEW.score IS NULL OR NEW.score = OLD.score THEN RETURN NEW; END IF;

  SELECT it.passing_score_threshold, it.name, s.name
  INTO v_threshold, v_tmpl_name, v_site_name
  FROM inspection_templates it
  LEFT JOIN sites s ON s.id = NEW.site_id
  WHERE it.id = NEW.template_id;

  IF NEW.score < COALESCE(v_threshold, 80) AND (OLD.score IS NULL OR OLD.score >= v_threshold) THEN
    PERFORM create_notification(
      'inspections.score_below_threshold',
      NEW.organisation_id, NEW.site_id,
      'inspection', NEW.id,
      jsonb_build_object(
        'inspection_number', NEW.inspection_number,
        'inspection_name',   v_tmpl_name,
        'site_name',         COALESCE(v_site_name, ''),
        'score',             NEW.score::text,
        'threshold',         v_threshold::text,
        'failed_items',      NEW.failed_questions::text,
        'reporter_id',       NEW.conducted_by
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_inspection_threshold
  AFTER UPDATE OF score ON inspections
  FOR EACH ROW EXECUTE FUNCTION check_inspection_score_threshold();

-- =============================================================
-- SUBMISSION TIMESTAMPS + SCHEDULE SYNC
-- BEFORE UPDATE on inspections: stamp timestamps on transitions.
-- AFTER UPDATE on inspections: advance schedule next_due_at.
-- =============================================================

CREATE OR REPLACE FUNCTION stamp_inspection_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status = 'scheduled' THEN
    NEW.started_at  := COALESCE(NEW.started_at, now());
    NEW.conducted_by:= COALESCE(NEW.conducted_by, auth.uid());
  END IF;

  IF NEW.status = 'completed' AND OLD.status NOT IN ('completed','submitted') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    NEW.submitted_at  := COALESCE(NEW.submitted_at, now());
    NEW.submitted_by  := COALESCE(NEW.submitted_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_inspection_timestamps
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION stamp_inspection_timestamps();

-- =============================================================
-- ADVANCE SCHEDULE AFTER COMPLETION
-- When an inspection is submitted, compute the next_due_at for
-- its parent schedule and fire the "inspection completed" notification.
-- =============================================================

CREATE OR REPLACE FUNCTION advance_schedule_after_completion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sched      record;
  v_next_due   timestamptz;
  v_site_name  text;
  v_tmpl_name  text;
BEGIN
  IF NEW.status != 'submitted' OR OLD.status = 'submitted' THEN RETURN NEW; END IF;

  SELECT s.name, t.name INTO v_site_name, v_tmpl_name
  FROM sites s, inspection_templates t
  WHERE s.id = NEW.site_id AND t.id = NEW.template_id;

  -- Notify completion
  PERFORM create_notification(
    'inspections.submitted',
    NEW.organisation_id, NEW.site_id,
    'inspection', NEW.id,
    jsonb_build_object(
      'inspection_number', NEW.inspection_number,
      'inspection_name',   COALESCE(v_tmpl_name, ''),
      'site_name',         COALESCE(v_site_name, ''),
      'score',             COALESCE(NEW.score::text, 'not scored'),
      'result',            COALESCE(NEW.result::text, ''),
      'reporter_id',       NEW.submitted_by
    )
  );

  IF NEW.schedule_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_sched FROM inspection_schedules WHERE id = NEW.schedule_id;

  -- Calculate next due date
  v_next_due := CASE v_sched.recurrence_type
    WHEN 'once'    THEN NULL
    WHEN 'daily'   THEN now() + ((v_sched.recurrence_config->>'interval_days')::integer || ' days')::interval
    WHEN 'weekly'  THEN now() + interval '7 days'
    WHEN 'monthly' THEN now() + interval '1 month'
    ELSE NULL  -- 'custom': handled by pg_cron / Edge Function
  END;

  UPDATE inspection_schedules
  SET last_completed_at = now(),
      next_due_at       = v_next_due,
      updated_at        = now()
  WHERE id = NEW.schedule_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_advance_schedule_after_completion
  AFTER UPDATE OF status ON inspections
  FOR EACH ROW EXECUTE FUNCTION advance_schedule_after_completion();

-- =============================================================
-- create_inspection_action()
-- Called by the application when the inspector completes the
-- "failed item" dialog. Creates a Module 5 action record,
-- links it via inspection_actions, and marks the response as
-- action_created = true.
-- =============================================================

CREATE OR REPLACE FUNCTION create_inspection_action(
  p_response_id       uuid,
  p_issue_description text,
  p_title             text    DEFAULT NULL,
  p_assigned_to       uuid    DEFAULT NULL,
  p_priority          text    DEFAULT 'medium',
  p_due_date          date    DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_response     record;
  v_inspection   record;
  v_question     record;
  v_action_id    uuid;
  v_title        text;
BEGIN
  SELECT * INTO v_response   FROM inspection_responses ir WHERE ir.id = p_response_id;
  SELECT * INTO v_inspection FROM inspections i WHERE i.id = v_response.inspection_id;
  SELECT * INTO v_question   FROM inspection_template_questions WHERE id = v_response.question_id;

  v_title := COALESCE(
    p_title,
    v_question.suggested_action,
    'Failed inspection item: ' || v_question.question_text
  );

  -- Create the unified action (Module 5)
  INSERT INTO actions (
    organisation_id, site_id,
    action_type, priority,
    source_type, source_id, source_reference,
    title, description,
    assigned_to, assigned_by, assigned_at,
    due_date, verification_required,
    created_by
  ) VALUES (
    v_inspection.organisation_id, v_inspection.site_id,
    'corrective', p_priority,
    'inspection', v_inspection.id, v_inspection.inspection_number,
    v_title, COALESCE(p_issue_description, v_title),
    p_assigned_to, auth.uid(), CASE WHEN p_assigned_to IS NOT NULL THEN now() END,
    p_due_date, true,
    auth.uid()
  )
  RETURNING id INTO v_action_id;

  -- Link the action to the inspection response
  INSERT INTO inspection_actions (
    inspection_id, response_id, action_id,
    organisation_id, issue_description, created_by
  ) VALUES (
    v_inspection.id, p_response_id, v_action_id,
    v_inspection.organisation_id, p_issue_description, auth.uid()
  );

  -- Mark the response as having an action
  UPDATE inspection_responses
  SET action_created = true, updated_at = now()
  WHERE id = p_response_id;

  -- Reflect on inspection
  UPDATE inspections
  SET has_open_actions = true, updated_at = now()
  WHERE id = v_inspection.id;

  RETURN v_action_id;
END;
$$;

-- =============================================================
-- create_scheduled_inspection()
-- Called by the scheduler (pg_cron / Edge Function) to generate
-- a new inspection instance from a schedule when it comes due.
-- =============================================================

CREATE OR REPLACE FUNCTION create_scheduled_inspection(
  p_schedule_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sched         record;
  v_inspection_id uuid;
BEGIN
  SELECT * INTO v_sched FROM inspection_schedules WHERE id = p_schedule_id AND is_active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO inspections (
    organisation_id, site_id, department_id, work_area_id,
    template_id, schedule_id,
    conducted_by,
    status
  ) VALUES (
    v_sched.organisation_id, v_sched.site_id, v_sched.department_id, v_sched.work_area_id,
    v_sched.template_id, v_sched.id,
    v_sched.assigned_to,
    'scheduled'
  )
  RETURNING id INTO v_inspection_id;

  -- Notify the assigned conductor
  PERFORM create_notification(
    'inspections.scheduled',
    v_sched.organisation_id, v_sched.site_id,
    'inspection', v_inspection_id,
    jsonb_build_object(
      'inspection_number', (SELECT inspection_number FROM inspections WHERE id = v_inspection_id),
      'schedule_name',     v_sched.name,
      'due_date',          v_sched.next_due_at::text,
      'reporter_id',       v_sched.assigned_to
    )
  );

  RETURN v_inspection_id;
END;
$$;

-- =============================================================
-- mark_overdue_inspections()
-- Called daily by pg_cron. Marks inspections past their schedule
-- window as overdue and fires notifications.
-- =============================================================

CREATE OR REPLACE FUNCTION mark_overdue_inspections()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE inspections i
  SET is_overdue = true, updated_at = now()
  FROM inspection_schedules s
  WHERE i.schedule_id = s.id
    AND i.status       IN ('scheduled', 'draft')
    AND i.is_overdue   = false
    AND s.next_due_at + (s.overdue_after_hours || ' hours')::interval < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================
-- ROW VERSIONING
-- =============================================================

CREATE TRIGGER version_inspections
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();
