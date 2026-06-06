-- =============================================================
-- MODULE 17: Row Level Security — Analytics & Reporting
-- =============================================================

ALTER TABLE kpi_definitions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_hours_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_definitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_execution_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widget_configs ENABLE ROW LEVEL SECURITY;

-- KPI definitions: all authenticated read (reference data)
CREATE POLICY "kpid_select" ON kpi_definitions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpid_write"  ON kpi_definitions FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "kpid_update" ON kpi_definitions FOR UPDATE USING (is_system_admin());

-- KPI snapshots: read own org's data; computed by SECURITY DEFINER function
CREATE POLICY "kpis_select" ON kpi_snapshots FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_executive() OR is_hse_officer() OR is_system_admin() OR is_supervisor()));

-- KPI targets: HSE/admin manage; elevated roles read
CREATE POLICY "kpit_select" ON kpi_targets FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_executive() OR is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "kpit_write"  ON kpi_targets FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "kpit_update" ON kpi_targets FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Workforce hours: supervisors/HSE create; elevated roles read
CREATE POLICY "whl_select" ON workforce_hours_logs FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin() OR is_executive()));
CREATE POLICY "whl_insert" ON workforce_hours_logs FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "whl_update" ON workforce_hours_logs FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Report definitions: system templates visible to all; org reports visible to org members
CREATE POLICY "rdef_select_system"  ON report_definitions FOR SELECT
  USING (is_system_template = true);
CREATE POLICY "rdef_select_own_org" ON report_definitions FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_shared = true OR created_by = auth.uid() OR is_hse_officer() OR is_system_admin() OR is_executive()));
CREATE POLICY "rdef_insert"  ON report_definitions FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor()));
CREATE POLICY "rdef_update"  ON report_definitions FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (created_by = auth.uid() OR is_hse_officer() OR is_system_admin()));

-- Report schedules: HSE/admin manage; elevated roles read
CREATE POLICY "rsched_select" ON report_schedules FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_executive()));
CREATE POLICY "rsched_write"  ON report_schedules FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "rsched_update" ON report_schedules FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Execution log: read-only for elevated roles
CREATE POLICY "rlog_select"  ON report_execution_log FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_executive()));

-- Dashboard widget configs: each user manages their own
CREATE POLICY "dwc_select"  ON dashboard_widget_configs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dwc_insert"  ON dashboard_widget_configs FOR INSERT WITH CHECK (user_id = auth.uid() AND organisation_id = get_my_organisation_id());
CREATE POLICY "dwc_update"  ON dashboard_widget_configs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "dwc_delete"  ON dashboard_widget_configs FOR DELETE USING (user_id = auth.uid());
