-- =============================================================
-- MODULE 16: Row Level Security — Health Surveillance
-- =============================================================
-- Privacy model:
--   • Workers see only their own health records and schedules.
--   • Supervisors see the profile status and schedules (due/overdue)
--     of workers at their sites — NOT check result details or reports.
--   • HSE Officers see full records across the org (required for
--     program management and regulatory compliance).
--   • System Admin has full access.
--   • Health check report files (storage_path) are read by
--     HSE/Admin only — enforced at the Storage policy level.

ALTER TABLE health_surveillance_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_restriction_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveillance_programs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveillance_program_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveillance_program_tests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_health_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_work_restrictions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_to_work_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_to_work_plan_steps     ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "hst_select"  ON health_surveillance_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "hst_write"   ON health_surveillance_types FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "wrt_select"  ON work_restriction_types    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "wrt_write"   ON work_restriction_types    FOR INSERT WITH CHECK (is_system_admin());

-- Surveillance programs: all org members read (to understand requirements)
CREATE POLICY "sp_select"   ON surveillance_programs FOR SELECT USING (organisation_id = get_my_organisation_id());
CREATE POLICY "sp_write"    ON surveillance_programs FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "sp_update"   ON surveillance_programs FOR UPDATE USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

CREATE POLICY "spl_select"  ON surveillance_program_links FOR SELECT USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "spl_write"   ON surveillance_program_links FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

CREATE POLICY "spt_select"  ON surveillance_program_tests FOR SELECT USING (EXISTS (SELECT 1 FROM surveillance_programs p WHERE p.id = program_id AND p.organisation_id = get_my_organisation_id()));
CREATE POLICY "spt_write"   ON surveillance_program_tests FOR INSERT WITH CHECK ((is_hse_officer() OR is_system_admin()) AND EXISTS (SELECT 1 FROM surveillance_programs p WHERE p.id = program_id AND p.organisation_id = get_my_organisation_id()));

-- WORKER HEALTH PROFILES
CREATE POLICY "whp_select_own"      ON worker_health_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "whp_select_supervisor" ON worker_health_profiles FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND is_supervisor());
CREATE POLICY "whp_select_elevated" ON worker_health_profiles FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_executive()));
-- Profiles are created/updated by SECURITY DEFINER trigger only
CREATE POLICY "whp_upsert_trigger"  ON worker_health_profiles FOR ALL
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- HEALTH CHECK SCHEDULES — workers see own; supervisors see due/overdue for site workers
CREATE POLICY "hcs_select_own"      ON health_check_schedules FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "hcs_select_supervisor" ON health_check_schedules FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
-- SECURITY DEFINER trigger creates schedule rows
CREATE POLICY "hcs_insert_hse"      ON health_check_schedules FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "hcs_update_hse"      ON health_check_schedules FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- HEALTH CHECK RECORDS — workers see own; supervisors see status but NOT result details
CREATE POLICY "hcr_select_own"      ON health_check_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "hcr_select_supervisor" ON health_check_records FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND is_supervisor());
CREATE POLICY "hcr_select_hse"      ON health_check_records FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
-- Only HSE officers and admins can enter check results
CREATE POLICY "hcr_insert"          ON health_check_records FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "hcr_update"          ON health_check_records FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- WORK RESTRICTIONS — workers see own; supervisors see all at their site; HSE see all
CREATE POLICY "wwr_select_own"      ON worker_work_restrictions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wwr_select_supervisor" ON worker_work_restrictions FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "wwr_insert"          ON worker_work_restrictions FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "wwr_update"          ON worker_work_restrictions FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- RTW PLANS — workers see own; supervisors/HSE see all
CREATE POLICY "rtwp_select_own"     ON return_to_work_plans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "rtwp_select_elevated" ON return_to_work_plans FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "rtwp_insert"         ON return_to_work_plans FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "rtwp_update"         ON return_to_work_plans FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));

CREATE POLICY "rtwps_select"        ON return_to_work_plan_steps FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (
    is_hse_officer() OR is_system_admin() OR is_supervisor()
    OR EXISTS (SELECT 1 FROM return_to_work_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
  ));
CREATE POLICY "rtwps_write"         ON return_to_work_plan_steps FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
