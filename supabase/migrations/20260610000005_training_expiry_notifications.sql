-- =============================================================
-- Gap 7: Certification Expiry Notifications
-- Adds a system notification template for training.expiring_soon,
-- a PL/pgSQL function to scan for expiring records, and a nightly
-- pg_cron job to invoke it.
-- =============================================================

-- Seed notification template for training expiry if not exists
INSERT INTO notification_templates
  (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active)
VALUES (
  NULL,
  'training.expiring_soon',
  'Training Expiring Soon',
  'Training expiring: {{course_name}} for {{worker_name}}',
  'The {{course_name}} certification for {{worker_name}} ({{record_number}}) expires on {{expiry_date}} — in {{days_remaining}} days. Please arrange renewal.',
  '["course_name","worker_name","expiry_date","record_number","days_remaining"]'::jsonb,
  true
)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- Function: send notifications for training records expiring in next 60 days
-- Called by pg_cron nightly
CREATE OR REPLACE FUNCTION check_expiring_training() RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      tr.id,
      tr.worker_id,
      tr.organisation_id,
      tr.expiry_date,
      tr.record_number,
      tc.name AS course_name,
      up.first_name || ' ' || up.last_name AS worker_name,
      (tr.expiry_date - CURRENT_DATE)::int AS days_remaining
    FROM training_records tr
    JOIN training_courses tc ON tc.id = tr.course_id
    JOIN user_profiles up ON up.id = tr.worker_id
    WHERE tr.status = 'expiring_soon'
      AND tr.expiry_date >= CURRENT_DATE
      AND tr.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
      AND tr.organisation_id IS NOT NULL
  LOOP
    PERFORM create_notification(
      'training.expiring_soon'::text,
      rec.organisation_id,
      NULL::uuid,
      'training_record'::text,
      rec.id,
      jsonb_build_object(
        'course_name',     rec.course_name,
        'worker_name',     rec.worker_name,
        'expiry_date',     rec.expiry_date::text,
        'record_number',   COALESCE(rec.record_number, rec.id::text),
        'days_remaining',  rec.days_remaining::text
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Register nightly cron job (requires pg_cron extension enabled in Supabase Dashboard)
-- To enable: Dashboard → Database → Extensions → pg_cron → Enable
DO $$
BEGIN
  -- Only schedule if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'check-training-expiry',
      '0 8 * * *',  -- 8am UTC daily
      'SELECT check_expiring_training()'
    );
  END IF;
END $$;
