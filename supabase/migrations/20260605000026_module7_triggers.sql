-- =============================================================
-- MODULE 7: Triggers & Functions — Risk Register
-- =============================================================

-- =============================================================
-- UPDATED_AT HOUSEKEEPING
-- =============================================================

CREATE TRIGGER trg_risks_updated_at
  BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_risk_controls_updated_at
  BEFORE UPDATE ON risk_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_risk_reviews_updated_at
  BEFORE UPDATE ON risk_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hazard_reports_updated_at
  BEFORE UPDATE ON hazard_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- REFERENCE NUMBER GENERATION
-- =============================================================

CREATE OR REPLACE FUNCTION generate_risk_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.risk_number IS NULL THEN
    NEW.risk_number := next_reference_number('risk', NEW.organisation_id, 'RISK');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_risk_number
  BEFORE INSERT ON risks FOR EACH ROW EXECUTE FUNCTION generate_risk_number();

CREATE OR REPLACE FUNCTION generate_hazard_report_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.report_number IS NULL THEN
    NEW.report_number := next_reference_number('hazard_report', NEW.organisation_id, 'HAZ');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_hazard_report_number
  BEFORE INSERT ON hazard_reports FOR EACH ROW EXECUTE FUNCTION generate_hazard_report_number();

CREATE OR REPLACE FUNCTION generate_risk_review_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.review_number IS NULL THEN
    NEW.review_number := next_reference_number('risk_review', NEW.organisation_id, 'RREV');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_risk_review_number
  BEFORE INSERT ON risk_reviews FOR EACH ROW EXECUTE FUNCTION generate_risk_review_number();

-- =============================================================
-- RISK LEVEL COMPUTATION
-- BEFORE INSERT OR UPDATE on risks:
-- Looks up inherent_risk_level and residual_risk_level from
-- risk_matrix_thresholds based on the computed score columns.
-- Also sets next_review_date on INSERT if not already provided.
-- =============================================================

CREATE OR REPLACE FUNCTION get_risk_level(p_score integer)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT label
  FROM risk_matrix_thresholds
  WHERE p_score BETWEEN min_score AND max_score
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION compute_risk_levels()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- inherent_risk_score is a GENERATED ALWAYS AS column;
  -- compute the level from its new value
  NEW.inherent_risk_level := get_risk_level(
    NEW.likelihood_score * NEW.consequence_score
  );

  IF NEW.residual_likelihood_score IS NOT NULL
     AND NEW.residual_consequence_score IS NOT NULL
  THEN
    NEW.residual_risk_level := get_risk_level(
      NEW.residual_likelihood_score * NEW.residual_consequence_score
    );
  ELSE
    NEW.residual_risk_level := NULL;
  END IF;

  -- Set initial next_review_date on INSERT
  IF TG_OP = 'INSERT' AND NEW.next_review_date IS NULL THEN
    NEW.next_review_date := CURRENT_DATE + CASE NEW.review_frequency
      WHEN 'monthly'    THEN interval '1 month'
      WHEN 'quarterly'  THEN interval '3 months'
      WHEN 'biannual'   THEN interval '6 months'
      WHEN 'annually'   THEN interval '1 year'
      WHEN 'biennial'   THEN interval '2 years'
      ELSE NULL
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_risk_levels
  BEFORE INSERT OR UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION compute_risk_levels();

-- =============================================================
-- CRITICAL / HIGH RISK NOTIFICATION
-- AFTER INSERT on risks: if inherent risk score is Critical or
-- High, notify the risk owner and HSE Officers immediately.
-- =============================================================

CREATE OR REPLACE FUNCTION notify_high_risk_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_site_name text;
BEGIN
  IF NEW.inherent_risk_score < 10 THEN RETURN NEW; END IF;

  SELECT name INTO v_site_name FROM sites WHERE id = NEW.site_id;

  PERFORM create_notification(
    'risks.high_risk_created',
    NEW.organisation_id, NEW.site_id,
    'risk', NEW.id,
    jsonb_build_object(
      'risk_number',    NEW.risk_number,
      'risk_title',     NEW.title,
      'risk_level',     NEW.inherent_risk_level,
      'risk_score',     NEW.inherent_risk_score::text,
      'site_name',      COALESCE(v_site_name, ''),
      'reporter_id',    NEW.owner_id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_high_risk_created
  AFTER INSERT ON risks
  FOR EACH ROW EXECUTE FUNCTION notify_high_risk_created();

-- =============================================================
-- RISK STATUS CHANGE — notifications + row versioning
-- =============================================================

CREATE OR REPLACE FUNCTION track_risk_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  PERFORM create_notification(
    'risks.' || NEW.status,
    NEW.organisation_id, NEW.site_id,
    'risk', NEW.id,
    jsonb_build_object(
      'risk_number',    NEW.risk_number,
      'risk_title',     NEW.title,
      'risk_level',     COALESCE(NEW.residual_risk_level, NEW.inherent_risk_level),
      'reporter_id',    NEW.owner_id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_risk_status_change
  AFTER UPDATE OF status ON risks
  FOR EACH ROW EXECUTE FUNCTION track_risk_status_change();

-- =============================================================
-- REVIEW COMPLETION HANDLER
-- AFTER UPDATE OF status on risk_reviews:
-- When a review is completed, updates the parent risk's
-- scores (if changed), last_reviewed_at, and next_review_date.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_risk_review_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_risk       record;
  v_next_date  date;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;

  NEW.completed_at := COALESCE(NEW.completed_at, now());
  NEW.completed_by := COALESCE(NEW.completed_by, auth.uid());

  SELECT * INTO v_risk FROM risks WHERE id = NEW.risk_id;

  -- Calculate next review date
  v_next_date := NEW.completed_at::date + CASE v_risk.review_frequency
    WHEN 'monthly'    THEN interval '1 month'
    WHEN 'quarterly'  THEN interval '3 months'
    WHEN 'biannual'   THEN interval '6 months'
    WHEN 'annually'   THEN interval '1 year'
    WHEN 'biennial'   THEN interval '2 years'
    ELSE interval '0'
  END;

  -- Snapshot previous scores before update
  NEW.prev_likelihood          := v_risk.likelihood_score;
  NEW.prev_consequence         := v_risk.consequence_score;
  NEW.prev_residual_likelihood := v_risk.residual_likelihood_score;
  NEW.prev_residual_consequence:= v_risk.residual_consequence_score;

  -- Apply updated scores (if the reviewer changed them)
  UPDATE risks
  SET likelihood_score          = COALESCE(NEW.new_likelihood,           v_risk.likelihood_score),
      consequence_score         = COALESCE(NEW.new_consequence,          v_risk.consequence_score),
      residual_likelihood_score = COALESCE(NEW.new_residual_likelihood,  v_risk.residual_likelihood_score),
      residual_consequence_score= COALESCE(NEW.new_residual_consequence, v_risk.residual_consequence_score),
      last_reviewed_at          = now(),
      last_reviewed_by          = auth.uid(),
      next_review_date          = v_next_date,
      status                    = CASE WHEN NEW.outcome = 'closed' THEN 'closed' ELSE 'active' END,
      updated_at                = now()
  WHERE id = NEW.risk_id;

  -- Notify owner that the review was completed
  PERFORM create_notification(
    'risks.review_completed',
    NEW.organisation_id, v_risk.site_id,
    'risk_review', NEW.id,
    jsonb_build_object(
      'risk_number',    v_risk.risk_number,
      'risk_title',     v_risk.title,
      'next_review',    v_next_date::text,
      'reporter_id',    v_risk.owner_id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_risk_review_completed
  BEFORE UPDATE OF status ON risk_reviews
  FOR EACH ROW EXECUTE FUNCTION handle_risk_review_completed();

-- =============================================================
-- HAZARD REPORT → RISK PROMOTION RPC
-- Called by the HSE Officer / Supervisor when they decide a
-- hazard report warrants a formal risk register entry.
-- =============================================================

CREATE OR REPLACE FUNCTION promote_hazard_to_risk(
  p_report_id              uuid,
  p_title                  text,
  p_likelihood_score       integer,
  p_consequence_score      integer,
  p_existing_controls      text    DEFAULT NULL,
  p_residual_likelihood    integer DEFAULT NULL,
  p_residual_consequence   integer DEFAULT NULL,
  p_owner_id               uuid    DEFAULT NULL,
  p_category_id            uuid    DEFAULT NULL,
  p_review_frequency       text    DEFAULT 'quarterly'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_report    record;
  v_risk_id   uuid;
BEGIN
  SELECT * INTO v_report FROM hazard_reports WHERE id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hazard report not found'; END IF;
  IF v_report.status = 'promoted_to_risk' THEN
    RAISE EXCEPTION 'Hazard report has already been promoted';
  END IF;

  -- Create the formal risk entry
  INSERT INTO risks (
    organisation_id, site_id, department_id, work_area_id,
    category_id, title, hazard_description,
    location_activity, people_at_risk,
    likelihood_score, consequence_score,
    existing_controls_summary,
    residual_likelihood_score, residual_consequence_score,
    owner_id, review_frequency,
    source_type, source_id, source_reference,
    created_by
  ) VALUES (
    v_report.organisation_id, v_report.site_id, v_report.department_id, v_report.work_area_id,
    p_category_id, p_title, v_report.description,
    v_report.location_details, '{}',
    p_likelihood_score, p_consequence_score,
    p_existing_controls,
    p_residual_likelihood, p_residual_consequence,
    COALESCE(p_owner_id, auth.uid()), p_review_frequency,
    'hazard_report', v_report.id, v_report.report_number,
    auth.uid()
  )
  RETURNING id INTO v_risk_id;

  -- Mark the hazard report as promoted
  UPDATE hazard_reports
  SET status              = 'promoted_to_risk',
      promoted_to_risk_id = v_risk_id,
      reviewed_by         = auth.uid(),
      reviewed_at         = now(),
      updated_at          = now()
  WHERE id = p_report_id;

  -- Notify the original reporter
  PERFORM create_notification(
    'risks.hazard_promoted',
    v_report.organisation_id, v_report.site_id,
    'risk', v_risk_id,
    jsonb_build_object(
      'risk_number',    (SELECT risk_number FROM risks WHERE id = v_risk_id),
      'risk_title',     p_title,
      'report_number',  v_report.report_number,
      'reporter_id',    v_report.reported_by
    )
  );

  RETURN v_risk_id;
END;
$$;

-- =============================================================
-- BULK OVERDUE REVIEW SWEEP — called by pg_cron daily
-- =============================================================

CREATE OR REPLACE FUNCTION mark_overdue_risk_reviews()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer; BEGIN
  -- Mark scheduled reviews past their date as overdue
  UPDATE risk_reviews
  SET status = 'overdue', updated_at = now()
  WHERE scheduled_date < CURRENT_DATE
    AND status = 'scheduled';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Also flag risks whose next_review_date has passed
  UPDATE risks
  SET status = 'under_review', updated_at = now()
  WHERE next_review_date < CURRENT_DATE
    AND status = 'active';

  RETURN v_count;
END;
$$;

-- =============================================================
-- HAZARD REPORT SUBMISSION — NOTIFY SUPERVISOR/HSE
-- =============================================================

CREATE OR REPLACE FUNCTION notify_hazard_report_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_site_name text; BEGIN
  SELECT name INTO v_site_name FROM sites WHERE id = NEW.site_id;

  PERFORM create_notification(
    'risks.hazard_report_submitted',
    NEW.organisation_id, NEW.site_id,
    'hazard_report', NEW.id,
    jsonb_build_object(
      'report_number',     NEW.report_number,
      'report_title',      NEW.title,
      'site_name',         COALESCE(v_site_name, ''),
      'severity',          NEW.severity_perception,
      'reporter_id',       NEW.reported_by
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_hazard_report_submitted
  AFTER INSERT ON hazard_reports
  FOR EACH ROW EXECUTE FUNCTION notify_hazard_report_submitted();

-- =============================================================
-- ROW VERSIONING
-- =============================================================

CREATE TRIGGER version_risks
  AFTER INSERT OR UPDATE OR DELETE ON risks
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_risk_reviews
  AFTER INSERT OR UPDATE OR DELETE ON risk_reviews
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();
