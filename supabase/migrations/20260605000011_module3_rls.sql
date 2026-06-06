-- =============================================================
-- MODULE 3: Row Level Security — Notifications & Alerts
-- =============================================================
-- Access design:
--   notifications          → users see only their own inbox
--   notification_deliveries→ users see deliveries for their notifications
--   notification_preferences→ users manage their own; admins read-all
--   notification_templates → system templates readable by all; org templates by org members
--   notification_rules     → HSE Officer / System Admin manage
--   notification_schedules → HSE Officer / System Admin manage
--   escalation_chains/steps→ HSE Officer / System Admin manage
--   active_escalations     → HSE Officer / System Admin monitor
-- =============================================================

ALTER TABLE notification_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rule_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_chains            ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_steps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_escalations           ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- NOTIFICATION TEMPLATES
-- System templates (organisation_id IS NULL) are read-only for
-- all authenticated users — they're the built-in defaults.
-- Org-specific templates are visible to all org members;
-- only System Admins and HSE Officers can write them.
-- =============================================================

CREATE POLICY "ntpl_select" ON notification_templates FOR SELECT
  USING (
    organisation_id IS NULL                          -- system template
    OR organisation_id = get_my_organisation_id()    -- org template
  );

CREATE POLICY "ntpl_insert" ON notification_templates FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ntpl_update" ON notification_templates FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ntpl_delete" ON notification_templates FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- NOTIFICATION RULES
-- All org members can read rules (they need to understand
-- what will trigger notifications). Only admins/HSE write them.
-- =============================================================

CREATE POLICY "nr_select" ON notification_rules FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "nr_insert" ON notification_rules FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "nr_update" ON notification_rules FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "nr_delete" ON notification_rules FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- NOTIFICATION RULE RECIPIENTS
-- Readable by anyone who can read the rule.
-- Writable by System Admin / HSE Officer.
-- =============================================================

CREATE POLICY "nrr_select" ON notification_rule_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notification_rules nr
      WHERE nr.id = rule_id
        AND nr.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "nrr_insert" ON notification_rule_recipients FOR INSERT
  WITH CHECK (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM notification_rules nr
      WHERE nr.id = rule_id
        AND nr.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "nrr_delete" ON notification_rule_recipients FOR DELETE
  USING (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM notification_rules nr
      WHERE nr.id = rule_id
        AND nr.organisation_id = get_my_organisation_id()
    )
  );

-- =============================================================
-- NOTIFICATION PREFERENCES
-- Users fully control their own preferences.
-- System Admins can view all in the org (for support).
-- =============================================================

CREATE POLICY "np_select_own" ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "np_select_admin" ON notification_preferences FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "np_insert" ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "np_update" ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "np_delete" ON notification_preferences FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================
-- NOTIFICATION SCHEDULES
-- =============================================================

CREATE POLICY "ns_select" ON notification_schedules FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "ns_insert" ON notification_schedules FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ns_update" ON notification_schedules FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ns_delete" ON notification_schedules FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- NOTIFICATIONS (INBOX)
-- Core rule: users only ever see their own notifications.
-- Supabase Realtime respects RLS, so the real-time push is
-- automatically scoped to the authenticated user.
-- System Admins can read all org notifications for support.
-- =============================================================

CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "notif_select_admin" ON notifications FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- Notifications are created only by SECURITY DEFINER functions
-- (create_notification, fire_escalation_step) — no user INSERT policy.

-- Users can UPDATE their own notifications (read, ack, dismiss)
-- via the RPC functions which are SECURITY DEFINER; but we also
-- allow direct updates so the frontend can optimistically mark-as-read.
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid());

-- =============================================================
-- NOTIFICATION DELIVERIES
-- Users can see delivery status for their own notifications
-- (useful for "your email didn't arrive?" support UI).
-- Admins see all deliveries in their org.
-- Only SECURITY DEFINER delivery workers can INSERT/UPDATE.
-- =============================================================

CREATE POLICY "nd_select_own" ON notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
        AND n.recipient_user_id = auth.uid()
    )
  );

CREATE POLICY "nd_select_admin" ON notification_deliveries FOR SELECT
  USING (
    is_system_admin()
    AND EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
        AND n.organisation_id = get_my_organisation_id()
    )
  );

-- =============================================================
-- ESCALATION CHAINS
-- =============================================================

CREATE POLICY "ec_select" ON escalation_chains FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "ec_insert" ON escalation_chains FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ec_update" ON escalation_chains FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ec_delete" ON escalation_chains FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- ESCALATION STEPS
-- =============================================================

CREATE POLICY "es_select" ON escalation_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM escalation_chains ec
      WHERE ec.id = chain_id
        AND ec.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "es_insert" ON escalation_steps FOR INSERT
  WITH CHECK (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM escalation_chains ec
      WHERE ec.id = chain_id
        AND ec.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "es_update" ON escalation_steps FOR UPDATE
  USING (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM escalation_chains ec
      WHERE ec.id = chain_id
        AND ec.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "es_delete" ON escalation_steps FOR DELETE
  USING (
    is_system_admin()
    AND EXISTS (
      SELECT 1 FROM escalation_chains ec
      WHERE ec.id = chain_id
        AND ec.organisation_id = get_my_organisation_id()
    )
  );

-- =============================================================
-- ACTIVE ESCALATIONS
-- HSE Officers and System Admins can monitor active escalations.
-- Workers/Supervisors do not need to see escalation machinery.
-- SECURITY DEFINER functions handle all writes.
-- =============================================================

CREATE POLICY "ae_select_elevated" ON active_escalations FOR SELECT
  USING (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
        AND n.organisation_id = get_my_organisation_id()
    )
  );
