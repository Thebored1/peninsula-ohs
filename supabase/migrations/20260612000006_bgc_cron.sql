-- =============================================================
-- BACKGROUND CHECKS MODULE: pg_cron Scheduled Jobs
-- =============================================================

-- ─── LICENCE EXPIRY ALERT FUNCTION ───────────────────────────────────────────
-- Runs daily. Sends notifications at 90, 60, and 30 days before expiry,
-- and on expiry. Deduplicates using worker_licence_alerts to prevent
-- repeated alerts within the same expiry cycle.

CREATE OR REPLACE FUNCTION run_licence_expiry_alerts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lic   RECORD;
  v_today date := CURRENT_DATE;
BEGIN
  -- 90-day alerts
  FOR v_lic IN
    SELECT
      wl.id AS licence_id,
      wl.organisation_id,
      wl.worker_id,
      wl.licence_type,
      wl.licence_number,
      wl.expiry_date,
      up.first_name || ' ' || up.last_name AS worker_name,
      up.primary_site_id AS site_id
    FROM worker_licences wl
    JOIN user_profiles up ON up.id = wl.worker_id
    WHERE wl.status = 'active'
      AND wl.expiry_date = v_today + interval '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM worker_licence_alerts
        WHERE worker_licence_id = wl.id AND alert_type = '90day'
      )
  LOOP
    BEGIN
      PERFORM create_notification(
        'bgc.licence_expiry_90day'::text,
        v_lic.organisation_id,
        v_lic.site_id,
        'worker_licence'::text,
        v_lic.licence_id,
        jsonb_build_object(
          'worker_name',    v_lic.worker_name,
          'licence_type',   v_lic.licence_type,
          'licence_number', COALESCE(v_lic.licence_number, 'N/A'),
          'expiry_date',    v_lic.expiry_date::text
        )
      );
      INSERT INTO worker_licence_alerts (organisation_id, worker_licence_id, alert_type)
      VALUES (v_lic.organisation_id, v_lic.licence_id, '90day')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  -- 60-day alerts
  FOR v_lic IN
    SELECT
      wl.id AS licence_id,
      wl.organisation_id,
      wl.worker_id,
      wl.licence_type,
      wl.licence_number,
      wl.expiry_date,
      up.first_name || ' ' || up.last_name AS worker_name,
      up.primary_site_id AS site_id
    FROM worker_licences wl
    JOIN user_profiles up ON up.id = wl.worker_id
    WHERE wl.status = 'active'
      AND wl.expiry_date = v_today + interval '60 days'
      AND NOT EXISTS (
        SELECT 1 FROM worker_licence_alerts
        WHERE worker_licence_id = wl.id AND alert_type = '60day'
      )
  LOOP
    BEGIN
      PERFORM create_notification(
        'bgc.licence_expiry_60day'::text,
        v_lic.organisation_id,
        v_lic.site_id,
        'worker_licence'::text,
        v_lic.licence_id,
        jsonb_build_object(
          'worker_name',    v_lic.worker_name,
          'licence_type',   v_lic.licence_type,
          'licence_number', COALESCE(v_lic.licence_number, 'N/A'),
          'expiry_date',    v_lic.expiry_date::text
        )
      );
      INSERT INTO worker_licence_alerts (organisation_id, worker_licence_id, alert_type)
      VALUES (v_lic.organisation_id, v_lic.licence_id, '60day')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  -- 30-day alerts
  FOR v_lic IN
    SELECT
      wl.id AS licence_id,
      wl.organisation_id,
      wl.worker_id,
      wl.licence_type,
      wl.licence_number,
      wl.expiry_date,
      up.first_name || ' ' || up.last_name AS worker_name,
      up.primary_site_id AS site_id
    FROM worker_licences wl
    JOIN user_profiles up ON up.id = wl.worker_id
    WHERE wl.status = 'active'
      AND wl.expiry_date = v_today + interval '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM worker_licence_alerts
        WHERE worker_licence_id = wl.id AND alert_type = '30day'
      )
  LOOP
    BEGIN
      PERFORM create_notification(
        'bgc.licence_expiry_30day'::text,
        v_lic.organisation_id,
        v_lic.site_id,
        'worker_licence'::text,
        v_lic.licence_id,
        jsonb_build_object(
          'worker_name',    v_lic.worker_name,
          'licence_type',   v_lic.licence_type,
          'licence_number', COALESCE(v_lic.licence_number, 'N/A'),
          'expiry_date',    v_lic.expiry_date::text
        )
      );
      INSERT INTO worker_licence_alerts (organisation_id, worker_licence_id, alert_type)
      VALUES (v_lic.organisation_id, v_lic.licence_id, '30day')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  -- Expired today
  FOR v_lic IN
    SELECT
      wl.id AS licence_id,
      wl.organisation_id,
      wl.worker_id,
      wl.licence_type,
      wl.licence_number,
      wl.expiry_date,
      up.first_name || ' ' || up.last_name AS worker_name,
      up.primary_site_id AS site_id
    FROM worker_licences wl
    JOIN user_profiles up ON up.id = wl.worker_id
    WHERE wl.status = 'active'
      AND wl.expiry_date < v_today
      AND NOT EXISTS (
        SELECT 1 FROM worker_licence_alerts
        WHERE worker_licence_id = wl.id AND alert_type = 'expired'
      )
  LOOP
    BEGIN
      -- Mark licence as expired
      UPDATE worker_licences SET status = 'expired', updated_at = now()
      WHERE id = v_lic.licence_id;

      PERFORM create_notification(
        'bgc.licence_expired'::text,
        v_lic.organisation_id,
        v_lic.site_id,
        'worker_licence'::text,
        v_lic.licence_id,
        jsonb_build_object(
          'worker_name',    v_lic.worker_name,
          'licence_type',   v_lic.licence_type,
          'licence_number', COALESCE(v_lic.licence_number, 'N/A'),
          'expiry_date',    v_lic.expiry_date::text
        )
      );
      INSERT INTO worker_licence_alerts (organisation_id, worker_licence_id, alert_type)
      VALUES (v_lic.organisation_id, v_lic.licence_id, 'expired')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- ─── RE-VERIFICATION DUE FUNCTION ────────────────────────────────────────────
-- Runs daily. Flags scheduled re-verification events due within 30 days.

CREATE OR REPLACE FUNCTION run_reverification_due_checks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_evt   RECORD;
  v_today date := CURRENT_DATE;
BEGIN
  FOR v_evt IN
    SELECT
      e.id,
      e.organisation_id,
      e.worker_id,
      e.check_type,
      e.due_date,
      up.first_name || ' ' || up.last_name AS worker_name,
      up.primary_site_id AS site_id
    FROM bgc_reverification_events e
    JOIN user_profiles up ON up.id = e.worker_id
    WHERE e.status = 'scheduled'
      AND e.due_date <= v_today + interval '30 days'
  LOOP
    BEGIN
      PERFORM create_notification(
        'bgc.reverification_due'::text,
        v_evt.organisation_id,
        v_evt.site_id,
        'bgc_reverification_event'::text,
        v_evt.id,
        jsonb_build_object(
          'worker_name', v_evt.worker_name,
          'check_type',  v_evt.check_type::text,
          'due_date',    v_evt.due_date::text
        )
      );
      -- Advance status so repeat notifications are suppressed
      UPDATE bgc_reverification_events
      SET    status = 'consent_pending', updated_at = now()
      WHERE  id = v_evt.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- ─── SCHEDULE CRON JOBS ───────────────────────────────────────────────────────

SELECT cron.schedule(
  'bgc-licence-expiry-alerts',
  '0 8 * * *',
  'SELECT run_licence_expiry_alerts()'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

SELECT cron.schedule(
  'bgc-reverification-due',
  '30 8 * * *',
  'SELECT run_reverification_due_checks()'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
