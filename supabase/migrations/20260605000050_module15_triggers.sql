-- =============================================================
-- MODULE 15: Triggers & Functions — Environmental Monitoring
-- =============================================================

CREATE TRIGGER trg_ems_updated_at
  BEFORE UPDATE ON env_monitoring_stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_err_updated_at
  BEFORE UPDATE ON env_reporting_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ers_updated_at
  BEFORE UPDATE ON env_report_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- COMPLIANCE LIMIT CHECK
-- When a monitoring record is inserted, compare the measured
-- value against the active limits for that parameter and site.
-- Sets exceeds_limit = true and fires a notification.
-- =============================================================

CREATE OR REPLACE FUNCTION check_env_compliance_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limit record;
  v_exceeded boolean := false;
BEGIN
  FOR v_limit IN
    SELECT * FROM env_compliance_limits
    WHERE parameter_type_id = NEW.parameter_type_id
      AND (site_id = NEW.site_id OR site_id IS NULL)
      AND is_active = true
      AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
      AND (effective_to   IS NULL OR effective_to   >= CURRENT_DATE)
  LOOP
    IF (v_limit.limit_type = 'maximum' AND NEW.measured_value > v_limit.limit_value)
    OR (v_limit.limit_type = 'minimum' AND NEW.measured_value < v_limit.limit_value)
    THEN
      v_exceeded := true;
      NEW.exceeds_limit     := true;
      NEW.limit_reference   := COALESCE(NEW.limit_reference, v_limit.regulatory_reference);
      NEW.investigation_required := true;
      EXIT;
    END IF;
  END LOOP;

  IF v_exceeded THEN
    PERFORM create_notification(
      'environment.limit_exceeded',
      NEW.organisation_id, NEW.site_id,
      'env_monitoring_record', NEW.id,
      jsonb_build_object(
        'parameter_type_id', NEW.parameter_type_id,
        'measured_value',    NEW.measured_value,
        'limit_reference',   NEW.limit_reference,
        'reporter_id',       NEW.recorded_by
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_env_compliance
  BEFORE INSERT ON env_monitoring_records
  FOR EACH ROW EXECUTE FUNCTION check_env_compliance_limit();

-- =============================================================
-- ADVANCE REPORTING REQUIREMENT DUE DATE
-- When a report submission is marked as 'submitted', advance
-- the parent requirement's next_due_date.
-- =============================================================

CREATE OR REPLACE FUNCTION advance_reporting_next_due()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_req record;
  v_next date;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    SELECT * INTO v_req FROM env_reporting_requirements WHERE id = NEW.requirement_id;

    v_next := CASE v_req.frequency
      WHEN 'weekly'    THEN NEW.reporting_period_end + interval '7 days'
      WHEN 'monthly'   THEN NEW.reporting_period_end + interval '1 month'
      WHEN 'quarterly' THEN NEW.reporting_period_end + interval '3 months'
      WHEN 'biannual'  THEN NEW.reporting_period_end + interval '6 months'
      WHEN 'annual'    THEN NEW.reporting_period_end + interval '1 year'
      ELSE NULL
    END;

    UPDATE env_reporting_requirements
    SET last_submitted_at = NEW.reporting_period_end,
        next_due_date     = v_next,
        updated_at        = now()
    WHERE id = NEW.requirement_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_advance_reporting_due
  AFTER UPDATE OF status ON env_report_submissions
  FOR EACH ROW EXECUTE FUNCTION advance_reporting_next_due();

-- =============================================================
-- REPORTING DUE ALERTS — daily sweep
-- =============================================================

CREATE OR REPLACE FUNCTION notify_env_reporting_due()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer := 0; v_rec record;
BEGIN
  FOR v_rec IN
    SELECT r.id, r.organisation_id, r.site_id, r.name, r.next_due_date, r.reminder_days
    FROM env_reporting_requirements r
    WHERE r.is_active = true
      AND r.next_due_date IS NOT NULL
      AND r.next_due_date <= CURRENT_DATE + r.reminder_days
      AND r.next_due_date >= CURRENT_DATE
  LOOP
    PERFORM create_notification(
      'environment.report_due',
      v_rec.organisation_id, v_rec.site_id,
      'env_reporting_requirement', v_rec.id,
      jsonb_build_object(
        'requirement_name', v_rec.name,
        'due_date',         v_rec.next_due_date::text
      )
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
