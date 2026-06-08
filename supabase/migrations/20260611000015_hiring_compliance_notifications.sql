-- =============================================================
-- HIRING MODULE: Compliance Alerts + Notification Templates
-- =============================================================

-- ─── Notification Templates ───────────────────────────────────────────────────

INSERT INTO notification_templates
  (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active)
VALUES
  (
    NULL,
    'hiring.completed',
    'New Hire Completed',
    'New hire completed: {{position_title}} — {{worker_name}}',
    'The hiring process for {{worker_name}} ({{position_title}}) has been completed. They are scheduled to start on {{start_date}}. Worker profile is now active.',
    '["worker_name","position_title","start_date","hire_number"]'::jsonb,
    true
  ),
  (
    NULL,
    'hiring.probation_review_due',
    'Probation Review Due',
    'Probation review due: {{worker_name}}',
    'The probation review for {{worker_name}} ({{position_title}}) is due on {{review_date}}. Please schedule a review meeting with {{worker_name}} before this date.',
    '["worker_name","position_title","review_date","hire_number"]'::jsonb,
    true
  ),
  (
    NULL,
    'hiring.contract_ending_soon',
    'Fixed-Term Contract Ending Soon',
    'Contract ending in 60 days: {{worker_name}}',
    'The fixed-term contract for {{worker_name}} ({{position_title}}) is ending on {{contract_end_date}} — in {{days_remaining}} days. Please decide whether to renew, convert, or let the contract expire.',
    '["worker_name","position_title","contract_end_date","days_remaining","hire_number"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- ─── Hiring Compliance Alert Function ─────────────────────────────────────────
-- Runs nightly via pg_cron to check for upcoming probation reviews
-- and contract end dates, creating notifications 7 days in advance.

CREATE OR REPLACE FUNCTION check_hiring_compliance_alerts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hire RECORD;
  v_today date := CURRENT_DATE;
  v_notification_horizon_days integer := 7;
BEGIN
  -- Probation reviews: notify when review date is within the next 7 days
  FOR v_hire IN
    SELECT
      h.id,
      h.organisation_id,
      h.site_id,
      h.hire_number,
      h.candidate_first_name || ' ' || h.candidate_last_name AS worker_name,
      h.position_title,
      (h.start_date + h.probation_period_days) AS review_date
    FROM hires h
    WHERE h.status = 'completed'
      AND h.probation_period_days IS NOT NULL
      AND h.start_date IS NOT NULL
      AND (h.start_date + h.probation_period_days)
          BETWEEN v_today AND (v_today + v_notification_horizon_days)
  LOOP
    BEGIN
      PERFORM create_notification(
        'hiring.probation_review_due'::text,
        v_hire.organisation_id,
        v_hire.site_id,
        'hire'::text,
        v_hire.id,
        jsonb_build_object(
          'worker_name',     v_hire.worker_name,
          'position_title',  COALESCE(v_hire.position_title, 'Unknown Position'),
          'review_date',     v_hire.review_date::text,
          'hire_number',     COALESCE(v_hire.hire_number, v_hire.id::text)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never fail the cron job due to notification errors
      NULL;
    END;
  END LOOP;

  -- Contract ending alerts: notify 60 days before end
  FOR v_hire IN
    SELECT
      h.id,
      h.organisation_id,
      h.site_id,
      h.hire_number,
      h.candidate_first_name || ' ' || h.candidate_last_name AS worker_name,
      h.position_title,
      h.contract_end_date,
      (h.contract_end_date - v_today) AS days_remaining
    FROM hires h
    WHERE h.status = 'completed'
      AND h.is_fixed_term = true
      AND h.contract_end_date IS NOT NULL
      AND (h.contract_end_date - 60)
          BETWEEN v_today AND (v_today + v_notification_horizon_days)
  LOOP
    BEGIN
      PERFORM create_notification(
        'hiring.contract_ending_soon'::text,
        v_hire.organisation_id,
        v_hire.site_id,
        'hire'::text,
        v_hire.id,
        jsonb_build_object(
          'worker_name',       v_hire.worker_name,
          'position_title',    COALESCE(v_hire.position_title, 'Unknown Position'),
          'contract_end_date', v_hire.contract_end_date::text,
          'days_remaining',    v_hire.days_remaining::text,
          'hire_number',       COALESCE(v_hire.hire_number, v_hire.id::text)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- Schedule nightly at 09:00 UTC (requires pg_cron extension — enable in Supabase Dashboard)
SELECT cron.schedule(
  'check-hiring-compliance-alerts',
  '0 9 * * *',
  'SELECT check_hiring_compliance_alerts()'
) WHERE EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
);
