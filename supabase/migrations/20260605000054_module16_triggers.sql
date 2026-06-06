-- =============================================================
-- MODULE 16: Triggers & Functions — Health Surveillance
-- =============================================================

CREATE TRIGGER trg_sp_updated_at
  BEFORE UPDATE ON surveillance_programs    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_whp_updated_at
  BEFORE UPDATE ON worker_health_profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_hcs_updated_at
  BEFORE UPDATE ON health_check_schedules   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_hcr_updated_at
  BEFORE UPDATE ON health_check_records     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rtwp_updated_at
  BEFORE UPDATE ON return_to_work_plans     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- HEALTH CHECK NUMBER — HC-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION generate_health_check_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.check_number IS NULL THEN
    NEW.check_number := next_reference_number('health_check', NEW.organisation_id, 'HC');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_health_check_number
  BEFORE INSERT ON health_check_records
  FOR EACH ROW EXECUTE FUNCTION generate_health_check_number();

-- =============================================================
-- RTW PLAN NUMBER — RTW-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION generate_rtw_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan_number IS NULL THEN
    NEW.plan_number := next_reference_number('rtw', NEW.organisation_id, 'RTW');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_rtw_number
  BEFORE INSERT ON return_to_work_plans
  FOR EACH ROW EXECUTE FUNCTION generate_rtw_number();

-- =============================================================
-- HANDLE HEALTH CHECK RESULT
-- After a check is recorded:
--   1. Mark the schedule entry as completed.
--   2. Create the next scheduled check.
--   3. Update the worker's health profile.
--   4. If restrictions were issued, notify supervisor and HSE.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_health_check_result()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile_id  uuid;
  v_prog_test   record;
BEGIN
  -- 1. Complete the schedule entry
  UPDATE health_check_schedules
  SET is_completed       = true,
      completed_check_id = NEW.id,
      updated_at         = now()
  WHERE id = NEW.schedule_id;

  -- 2. Schedule the next check if next_check_due is set
  IF NEW.next_check_due IS NOT NULL THEN
    INSERT INTO health_check_schedules (
      user_id, organisation_id, program_id, surveillance_type_id, due_date, is_baseline
    ) VALUES (
      NEW.user_id, NEW.organisation_id, NEW.program_id, NEW.surveillance_type_id,
      NEW.next_check_due, false
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Update worker health profile
  INSERT INTO worker_health_profiles (user_id, organisation_id, overall_status, last_check_date, next_check_due)
  VALUES (
    NEW.user_id, NEW.organisation_id,
    CASE NEW.result
      WHEN 'fit'                    THEN 'fit'
      WHEN 'fit_with_restrictions'  THEN 'fit_with_restrictions'
      WHEN 'temporarily_unfit'      THEN 'temporarily_unfit'
      WHEN 'refer_specialist'       THEN 'pending_review'
      ELSE 'pending_review'
    END,
    NEW.check_date,
    NEW.next_check_due
  )
  ON CONFLICT (user_id) DO UPDATE
    SET overall_status     = EXCLUDED.overall_status,
        last_check_date    = EXCLUDED.last_check_date,
        next_check_due     = COALESCE(EXCLUDED.next_check_due, worker_health_profiles.next_check_due),
        updated_at         = now();

  -- 4. Notify for non-fit results
  IF NEW.result IN ('fit_with_restrictions','temporarily_unfit','refer_specialist') THEN
    PERFORM create_notification(
      'health.check_result_action_required',
      NEW.organisation_id, NULL,
      'health_check_record', NEW.id,
      jsonb_build_object(
        'check_number', NEW.check_number,
        'result',       NEW.result,
        'reporter_id',  NEW.user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_health_check_result
  AFTER INSERT ON health_check_records
  FOR EACH ROW EXECUTE FUNCTION handle_health_check_result();

-- =============================================================
-- SYNC RESTRICTION FLAG ON WORKER PROFILE
-- When a work restriction is added or lifted, sync the
-- has_active_restrictions flag on worker_health_profiles.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_worker_restriction_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE worker_health_profiles
  SET has_active_restrictions = EXISTS (
        SELECT 1 FROM worker_work_restrictions
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND is_active = true
      ),
      updated_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_restriction_flag
  AFTER INSERT OR UPDATE OR DELETE ON worker_work_restrictions
  FOR EACH ROW EXECUTE FUNCTION sync_worker_restriction_flag();

-- =============================================================
-- OVERDUE SCHEDULE MARKING — daily sweep
-- =============================================================

CREATE OR REPLACE FUNCTION mark_overdue_health_checks()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  UPDATE health_check_schedules
  SET is_overdue = true, updated_at = now()
  WHERE due_date < CURRENT_DATE
    AND is_completed = false
    AND is_overdue   = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================
-- UPCOMING CHECK NOTIFICATIONS — daily sweep
-- =============================================================

CREATE OR REPLACE FUNCTION notify_upcoming_health_checks(p_days_ahead integer DEFAULT 14)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer := 0; v_rec record;
BEGIN
  FOR v_rec IN
    SELECT s.id, s.user_id, s.organisation_id, s.due_date, ht.name AS check_name
    FROM health_check_schedules s
    JOIN health_surveillance_types ht ON ht.id = s.surveillance_type_id
    WHERE s.is_completed  = false
      AND s.reminder_sent_at IS NULL
      AND s.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
  LOOP
    PERFORM create_notification(
      'health.check_due',
      v_rec.organisation_id, NULL,
      'health_check_schedule', v_rec.id,
      jsonb_build_object(
        'check_name', v_rec.check_name,
        'due_date',   v_rec.due_date::text,
        'reporter_id', v_rec.user_id
      )
    );

    UPDATE health_check_schedules SET reminder_sent_at = now() WHERE id = v_rec.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
