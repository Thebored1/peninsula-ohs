-- =============================================================
-- MODULE 17: Triggers & Functions — Analytics & Reporting
-- =============================================================

CREATE TRIGGER trg_rdef_updated_at
  BEFORE UPDATE ON report_definitions    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rsched_updated_at
  BEFORE UPDATE ON report_schedules      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_dwc_updated_at
  BEFORE UPDATE ON dashboard_widget_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- KPI COMPUTE ENGINE
-- compute_kpi_snapshot(formula_key, org_id, site_id, start, end)
-- Returns the computed value and saves a kpi_snapshots row.
-- All KPI logic is centralised here — add new KPIs without new
-- functions, just new kpi_definitions rows and a new WHEN clause.
-- =============================================================

CREATE OR REPLACE FUNCTION compute_kpi_snapshot(
  p_formula_key  text,
  p_org_id       uuid,
  p_site_id      uuid,         -- NULL for org-wide
  p_period_type  text,
  p_period_start date,
  p_period_end   date
) RETURNS decimal LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_kpi_id     uuid;
  v_value      decimal(18,4) := NULL;
  v_numer      decimal(18,4) := NULL;
  v_denom      decimal(18,4) := NULL;
  v_hours      decimal(18,4);
BEGIN
  SELECT id INTO v_kpi_id FROM kpi_definitions WHERE formula_key = p_formula_key;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Helper: sum hours worked for the scope and period
  SELECT COALESCE(SUM(whl.hours_worked), 0)
  INTO v_hours
  FROM workforce_hours_logs whl
  WHERE whl.organisation_id = p_org_id
    AND (p_site_id IS NULL OR whl.site_id = p_site_id)
    AND whl.period_start >= p_period_start
    AND whl.period_end   <= p_period_end;

  CASE p_formula_key

    -- =========================================================
    -- TRIFR — Total Recordable Injury Frequency Rate
    -- (Recordable incidents × 1,000,000) / Hours worked
    -- Recordable = medical_treatment / hospitalisation / fatality
    -- =========================================================
    WHEN 'trifr' THEN
      SELECT COUNT(DISTINCT i.id)
      INTO v_numer
      FROM incidents i
      JOIN incident_medical im ON im.incident_id = i.id
      WHERE i.organisation_id = p_org_id
        AND (p_site_id IS NULL OR i.site_id = p_site_id)
        AND i.occurred_at::date BETWEEN p_period_start AND p_period_end
        AND im.treatment_type IN ('medical_treatment','hospitalisation','fatality');

      v_denom := NULLIF(v_hours, 0);
      IF v_denom IS NOT NULL THEN
        v_value := ROUND((v_numer * 1000000.0) / v_denom, 4);
      END IF;

    -- =========================================================
    -- LTIFR — Lost Time Injury Frequency Rate
    -- (Lost time incidents × 1,000,000) / Hours worked
    -- =========================================================
    WHEN 'ltifr' THEN
      SELECT COUNT(DISTINCT i.id)
      INTO v_numer
      FROM incidents i
      JOIN incident_medical im ON im.incident_id = i.id
      WHERE i.organisation_id = p_org_id
        AND (p_site_id IS NULL OR i.site_id = p_site_id)
        AND i.occurred_at::date BETWEEN p_period_start AND p_period_end
        AND im.days_lost > 0;

      v_denom := NULLIF(v_hours, 0);
      IF v_denom IS NOT NULL THEN
        v_value := ROUND((v_numer * 1000000.0) / v_denom, 4);
      END IF;

    -- =========================================================
    -- Severity Rate — days lost per million hours worked
    -- =========================================================
    WHEN 'severity_rate' THEN
      SELECT COALESCE(SUM(im.days_lost), 0)
      INTO v_numer
      FROM incidents i
      JOIN incident_medical im ON im.incident_id = i.id
      WHERE i.organisation_id = p_org_id
        AND (p_site_id IS NULL OR i.site_id = p_site_id)
        AND i.occurred_at::date BETWEEN p_period_start AND p_period_end
        AND im.days_lost IS NOT NULL;

      v_denom := NULLIF(v_hours, 0);
      IF v_denom IS NOT NULL THEN
        v_value := ROUND((v_numer * 1000000.0) / v_denom, 4);
      END IF;

    -- =========================================================
    -- Near Miss Rate
    -- =========================================================
    WHEN 'near_miss_rate' THEN
      SELECT COUNT(i.id)
      INTO v_numer
      FROM incidents i
      JOIN incident_types it ON it.id = i.incident_type_id
      WHERE i.organisation_id = p_org_id
        AND (p_site_id IS NULL OR i.site_id = p_site_id)
        AND i.occurred_at::date BETWEEN p_period_start AND p_period_end
        AND it.code = 'near_miss';

      v_denom := NULLIF(v_hours, 0);
      IF v_denom IS NOT NULL THEN
        v_value := ROUND((v_numer * 1000000.0) / v_denom, 4);
      END IF;

    -- =========================================================
    -- Inspection Completion Rate — % of scheduled inspections
    -- completed on or before their scheduled date
    -- =========================================================
    WHEN 'inspection_completion_rate' THEN
      SELECT
        COUNT(*) FILTER (WHERE i.status = 'submitted' AND i.submitted_at::date <= is2.next_due_at::date),
        COUNT(*)
      INTO v_numer, v_denom
      FROM inspection_schedules is2
      JOIN inspections i ON i.schedule_id = is2.id
      WHERE is2.organisation_id = p_org_id
        AND (p_site_id IS NULL OR is2.site_id = p_site_id)
        AND i.scheduled_date BETWEEN p_period_start AND p_period_end;

      IF COALESCE(v_denom, 0) > 0 THEN
        v_value := ROUND((v_numer / v_denom) * 100.0, 2);
      END IF;

    -- =========================================================
    -- Action Closure Rate — % of CAPA actions closed on or
    -- before their due date within the period
    -- =========================================================
    WHEN 'action_closure_rate' THEN
      SELECT
        COUNT(*) FILTER (
          WHERE a.status IN ('verified','closed')
            AND COALESCE(a.verified_at, a.completed_at)::date
                  <= COALESCE(a.extended_due_date, a.due_date)
        ),
        COUNT(*)
      INTO v_numer, v_denom
      FROM actions a
      WHERE a.organisation_id = p_org_id
        AND (p_site_id IS NULL OR a.site_id = p_site_id)
        AND a.due_date BETWEEN p_period_start AND p_period_end;

      IF COALESCE(v_denom, 0) > 0 THEN
        v_value := ROUND((v_numer / v_denom) * 100.0, 2);
      END IF;

    -- =========================================================
    -- Audit Score — average conformance % across completed audits
    -- =========================================================
    WHEN 'audit_score' THEN
      SELECT
        ROUND(AVG(
          CASE WHEN a.total_criteria > 0
               THEN (a.conformance_count::decimal / a.total_criteria) * 100
          END
        ), 2),
        COUNT(*)
      INTO v_value, v_numer
      FROM audits a
      WHERE a.organisation_id = p_org_id
        AND (p_site_id IS NULL OR p_site_id = ANY(a.site_ids))
        AND a.status = 'completed'
        AND a.actual_end_date BETWEEN p_period_start AND p_period_end;

      v_denom := v_numer;

    -- =========================================================
    -- Hazard Report Rate
    -- (Hazard reports × 1,000,000) / Hours worked
    -- =========================================================
    WHEN 'hazard_report_rate' THEN
      SELECT COUNT(hr.id)
      INTO v_numer
      FROM hazard_reports hr
      WHERE hr.organisation_id = p_org_id
        AND (p_site_id IS NULL OR hr.site_id = p_site_id)
        AND hr.created_at::date BETWEEN p_period_start AND p_period_end;

      v_denom := NULLIF(v_hours, 0);
      IF v_denom IS NOT NULL THEN
        v_value := ROUND((v_numer * 1000000.0) / v_denom, 4);
      END IF;

    ELSE
      v_value := NULL;
  END CASE;

  -- Mark previous snapshots for this scope as not current
  UPDATE kpi_snapshots
  SET is_current = false
  WHERE kpi_definition_id = v_kpi_id
    AND organisation_id   = p_org_id
    AND (site_id          = p_site_id OR (site_id IS NULL AND p_site_id IS NULL))
    AND period_type       = p_period_type
    AND period_start      = p_period_start;

  -- Upsert the new snapshot
  INSERT INTO kpi_snapshots (
    kpi_definition_id, organisation_id, site_id, period_type,
    period_start, period_end, value, numerator, denominator,
    is_current, computed_at
  ) VALUES (
    v_kpi_id, p_org_id, p_site_id, p_period_type,
    p_period_start, p_period_end, v_value, v_numer, v_denom,
    true, now()
  )
  ON CONFLICT (kpi_definition_id, organisation_id, site_id, period_type, period_start)
  DO UPDATE
    SET value       = EXCLUDED.value,
        numerator   = EXCLUDED.numerator,
        denominator = EXCLUDED.denominator,
        is_current  = true,
        computed_at = now();

  RETURN v_value;
END;
$$;

-- =============================================================
-- BATCH KPI SNAPSHOT — called by pg_cron daily
-- Computes all active KPIs for all orgs and sites for the
-- current month and the rolling trailing 12 months.
-- =============================================================

CREATE OR REPLACE FUNCTION compute_all_kpi_snapshots()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org      record;
  v_site     record;
  v_kpi      record;
  v_count    integer := 0;
  v_mstart   date := date_trunc('month', CURRENT_DATE)::date;
  v_mend     date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  v_ystart   date := date_trunc('year',  CURRENT_DATE)::date;
  v_yend     date := CURRENT_DATE;
BEGIN
  FOR v_org IN SELECT id FROM organisations WHERE is_active = true LOOP
    FOR v_kpi IN SELECT formula_key FROM kpi_definitions WHERE is_active = true LOOP

      -- Org-wide monthly
      PERFORM compute_kpi_snapshot(v_kpi.formula_key, v_org.id, NULL, 'monthly', v_mstart, v_mend);
      -- Org-wide YTD
      PERFORM compute_kpi_snapshot(v_kpi.formula_key, v_org.id, NULL, 'yearly',  v_ystart, v_yend);
      v_count := v_count + 2;

      -- Per-site monthly
      FOR v_site IN SELECT id FROM sites WHERE organisation_id = v_org.id AND is_active = true LOOP
        PERFORM compute_kpi_snapshot(v_kpi.formula_key, v_org.id, v_site.id, 'monthly', v_mstart, v_mend);
        v_count := v_count + 1;
      END LOOP;

    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;

-- =============================================================
-- NEXT SCHEDULED REPORT RUN — advances report_schedules.next_run_at
-- after a successful execution.
-- =============================================================

CREATE OR REPLACE FUNCTION advance_report_schedule_next_run()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sched record;
BEGIN
  IF NEW.status = 'completed' AND NEW.schedule_id IS NOT NULL THEN
    SELECT * INTO v_sched FROM report_schedules WHERE id = NEW.schedule_id;

    UPDATE report_schedules
    SET last_run_at = NEW.started_at,
        next_run_at = CASE v_sched.frequency
          WHEN 'daily'     THEN now() + interval '1 day'
          WHEN 'weekly'    THEN now() + interval '7 days'
          WHEN 'monthly'   THEN now() + interval '1 month'
          WHEN 'quarterly' THEN now() + interval '3 months'
        END,
        updated_at = now()
    WHERE id = NEW.schedule_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_advance_report_schedule
  AFTER INSERT ON report_execution_log
  FOR EACH ROW EXECUTE FUNCTION advance_report_schedule_next_run();

-- =============================================================
-- CONVENIENCE VIEWS (non-materialized — read against snapshots)
-- =============================================================

-- Current KPI values with definitions and targets for an org
CREATE OR REPLACE VIEW v_kpi_current AS
SELECT
  ks.organisation_id,
  ks.site_id,
  kd.code,
  kd.name,
  kd.short_name,
  kd.unit,
  kd.indicator_type,
  kd.benchmark_direction,
  ks.period_type,
  ks.period_start,
  ks.period_end,
  ks.value,
  ks.numerator,
  ks.denominator,
  kt.target_value,
  CASE
    WHEN ks.value IS NULL OR kt.target_value IS NULL THEN 'no_data'
    WHEN kd.benchmark_direction = 'lower_is_better' AND ks.value <= kt.target_value THEN 'on_target'
    WHEN kd.benchmark_direction = 'higher_is_better' AND ks.value >= kt.target_value THEN 'on_target'
    ELSE 'off_target'
  END AS target_status,
  ks.computed_at
FROM kpi_snapshots ks
JOIN kpi_definitions kd ON kd.id = ks.kpi_definition_id
LEFT JOIN kpi_targets kt
  ON kt.kpi_definition_id = ks.kpi_definition_id
  AND kt.organisation_id  = ks.organisation_id
  AND (kt.site_id = ks.site_id OR (kt.site_id IS NULL AND ks.site_id IS NULL))
  AND kt.period_type      = ks.period_type
  AND kt.effective_from  <= ks.period_start
  AND (kt.effective_to IS NULL OR kt.effective_to >= ks.period_end)
WHERE ks.is_current = true;
