-- =============================================================
-- MODULE 14: Row Level Security — Chemical Management
-- =============================================================
-- Lookup tables: all authenticated read; admin write.
-- chemicals: all org members read; supervisors/HSE manage.
-- SDS: all org members read (workers need instant SDS access);
--   HSE/admin manage.
-- Inventory: workers read at their site; supervisors/HSE manage.
-- Usage logs: workers create own records; elevated roles read all.
-- Compatibility rules: all org members read; HSE/admin write.

ALTER TABLE chemical_categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_hazard_classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_physical_states       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemicals                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_hazard_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_sds                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_exposure_standards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_storage_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_usage_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_compatibility_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_waste_disposals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_incident_links        ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "ccat_select"  ON chemical_categories     FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ccat_write"   ON chemical_categories     FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "chc_select"   ON chemical_hazard_classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "chc_write"    ON chemical_hazard_classes FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "cps_select"   ON chemical_physical_states FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cps_write"    ON chemical_physical_states FOR INSERT WITH CHECK (is_system_admin());

-- CHEMICALS — all org members can read (SDS quick-access requires broad read)
CREATE POLICY "chem_select" ON chemicals FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "chem_insert" ON chemicals FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));

CREATE POLICY "chem_update" ON chemicals FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- HAZARD CLASSIFICATIONS
CREATE POLICY "chcl_select" ON chemical_hazard_classifications FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "chcl_write"  ON chemical_hazard_classifications FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- SDS — all org members can read; HSE/admin write
CREATE POLICY "csds_select" ON chemical_sds FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "csds_insert" ON chemical_sds FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "csds_update" ON chemical_sds FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- EXPOSURE STANDARDS
CREATE POLICY "ces_select" ON chemical_exposure_standards FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "ces_write"  ON chemical_exposure_standards FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- STORAGE LOCATIONS
CREATE POLICY "csl_select" ON chemical_storage_locations FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND can_access_site(site_id));
CREATE POLICY "csl_write"  ON chemical_storage_locations FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "csl_update" ON chemical_storage_locations FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- INVENTORY
CREATE POLICY "ci_select" ON chemical_inventory FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM chemical_storage_locations l WHERE l.id = storage_location_id AND can_access_site(l.site_id)
  ));
CREATE POLICY "ci_update" ON chemical_inventory FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));

-- TRANSACTIONS — insert via trigger only for balance; HSE/supervisor can insert directly
CREATE POLICY "cit_select" ON chemical_inventory_transactions FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "cit_insert" ON chemical_inventory_transactions FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));

-- USAGE LOGS — workers create own; supervisors/HSE see all at site
CREATE POLICY "cul_select_own"      ON chemical_usage_logs FOR SELECT
  USING (used_by = auth.uid());
CREATE POLICY "cul_select_elevated" ON chemical_usage_logs FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin())
         AND (site_id IS NULL OR can_access_site(site_id)));
CREATE POLICY "cul_insert"          ON chemical_usage_logs FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND used_by = auth.uid());

-- COMPATIBILITY RULES
CREATE POLICY "ccr_select" ON chemical_compatibility_rules FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "ccr_write"  ON chemical_compatibility_rules FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "ccr_update" ON chemical_compatibility_rules FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- WASTE DISPOSALS
CREATE POLICY "cwd_select" ON chemical_waste_disposals FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "cwd_insert" ON chemical_waste_disposals FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));

-- INCIDENT LINKS
CREATE POLICY "cil_select" ON chemical_incident_links FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "cil_write"  ON chemical_incident_links FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
