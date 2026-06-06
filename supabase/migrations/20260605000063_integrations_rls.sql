-- =============================================================
-- INTEGRATIONS: Row Level Security
-- =============================================================
-- Almost everything here is system-admin or HSE-officer only.
-- Workers and supervisors have no visibility into integration
-- configuration. API keys are owned by their creator.

ALTER TABLE integration_types                ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_field_mappings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_scopes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_event_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints                ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoint_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries               ENABLE ROW LEVEL SECURITY;

-- Integration types: any authenticated user can read (for setup UI)
CREATE POLICY "it_select"  ON integration_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "it_write"   ON integration_types FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "it_update"  ON integration_types FOR UPDATE USING (is_system_admin());

-- Integrations: system admin only (credentials stored here)
CREATE POLICY "int_select" ON integrations FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());
CREATE POLICY "int_write"  ON integrations FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND is_system_admin());
CREATE POLICY "int_update" ON integrations FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

-- Field mappings
CREATE POLICY "ifm_select" ON integration_field_mappings FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());
CREATE POLICY "ifm_write"  ON integration_field_mappings FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND is_system_admin());

-- Sync logs: system admin read; append-only by trigger
CREATE POLICY "isl_select" ON integration_sync_logs FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));

-- API KEYS: creator sees own; admin sees all
CREATE POLICY "ak_select_own"   ON api_keys FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "ak_select_admin" ON api_keys FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());
CREATE POLICY "ak_insert" ON api_keys FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
-- Revocation only (set revoked_at, is_active=false)
CREATE POLICY "ak_update" ON api_keys FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (created_by = auth.uid() OR is_system_admin()));

CREATE POLICY "aks_select" ON api_key_scopes FOR SELECT
  USING (EXISTS (SELECT 1 FROM api_keys ak WHERE ak.id = api_key_id AND (ak.created_by = auth.uid() OR is_system_admin())));
CREATE POLICY "aks_write"  ON api_key_scopes FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));

-- Webhook event types: all authenticated read (needed to select subscriptions in UI)
CREATE POLICY "wet_select" ON webhook_event_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "wet_write"  ON webhook_event_types FOR INSERT WITH CHECK (is_system_admin());

-- Webhook endpoints: HSE/admin manage
CREATE POLICY "whe_select" ON webhook_endpoints FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
CREATE POLICY "whe_insert" ON webhook_endpoints FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
CREATE POLICY "whe_update" ON webhook_endpoints FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));

CREATE POLICY "whes_select" ON webhook_endpoint_subscriptions FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
CREATE POLICY "whes_write"  ON webhook_endpoint_subscriptions FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));

-- Webhook deliveries: read-only for admin/HSE (append-only via trigger)
CREATE POLICY "whd_select" ON webhook_deliveries FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
