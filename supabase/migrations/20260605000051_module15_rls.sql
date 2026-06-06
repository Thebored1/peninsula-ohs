-- =============================================================
-- MODULE 15: Row Level Security — Environmental Monitoring
-- =============================================================

ALTER TABLE env_parameter_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_measurement_units      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_monitoring_stations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_monitoring_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_compliance_limits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_management_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_reporting_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_report_submissions     ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "ept_select"  ON env_parameter_types   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ept_write"   ON env_parameter_types   FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "emu_select"  ON env_measurement_units FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "emu_write"   ON env_measurement_units FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "wcat_select" ON waste_categories      FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "wcat_write"  ON waste_categories      FOR INSERT WITH CHECK (is_system_admin());

-- Monitoring stations
CREATE POLICY "ems_select" ON env_monitoring_stations FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND can_access_site(site_id));
CREATE POLICY "ems_write"  ON env_monitoring_stations FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "ems_update" ON env_monitoring_stations FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Monitoring records: workers can insert readings; all org members read
CREATE POLICY "emr_select" ON env_monitoring_records FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (site_id IS NULL OR can_access_site(site_id)));
CREATE POLICY "emr_insert" ON env_monitoring_records FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());
CREATE POLICY "emr_update" ON env_monitoring_records FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Compliance limits: HSE/admin manage; all read
CREATE POLICY "ecl_select" ON env_compliance_limits FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "ecl_write"  ON env_compliance_limits FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "ecl_update" ON env_compliance_limits FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Waste management logs
CREATE POLICY "wml_select" ON waste_management_logs FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()
         OR (site_id IS NOT NULL AND can_access_site(site_id))));
CREATE POLICY "wml_insert" ON waste_management_logs FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());
CREATE POLICY "wml_update" ON waste_management_logs FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));

-- Reporting requirements
CREATE POLICY "err_select" ON env_reporting_requirements FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor()));
CREATE POLICY "err_write"  ON env_reporting_requirements FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "err_update" ON env_reporting_requirements FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Report submissions
CREATE POLICY "ers_select" ON env_report_submissions FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor()));
CREATE POLICY "ers_insert" ON env_report_submissions FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "ers_update" ON env_report_submissions FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
