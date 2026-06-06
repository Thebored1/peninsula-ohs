-- =============================================================
-- MODULE 7: Row Level Security — Risk Register
-- =============================================================
-- Access matrix:
--
--   Lookup tables (risk_categories, likelihood/consequence levels,
--   risk_matrix_thresholds)
--     All authenticated users → SELECT
--     System Admin            → write
--
--   risks
--     Worker         → SELECT risks at their site (awareness);
--                       no direct INSERT (use hazard_reports)
--     Supervisor     → SELECT/INSERT/UPDATE at accessible sites
--     Risk Owner     → SELECT/UPDATE their own risk
--     HSE Officer    → Full org access
--     Executive      → SELECT only
--     System Admin   → Full access
--
--   risk_controls
--     Scoped by parent risk access
--
--   risk_reviews
--     Risk owner + reviewer: SELECT/UPDATE
--     Supervisor/HSE/Admin: full access at their scope
--
--   hazard_reports
--     Reporter: INSERT own + SELECT own
--     Supervisor: SELECT/review reports at their sites
--     HSE Officer: full org access
--
--   risk_linked_incidents
--     Scoped by risk access
-- =============================================================

ALTER TABLE risk_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_likelihood_levels   ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_consequence_levels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrix_thresholds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_controls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_linked_incidents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_report_evidence   ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- LOOKUP TABLES — visible to all authenticated users
-- =============================================================

CREATE POLICY "rcat_select"  ON risk_categories        FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rcat_write"   ON risk_categories        FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "rcat_update"  ON risk_categories        FOR UPDATE USING (is_system_admin());

CREATE POLICY "rll_select"   ON risk_likelihood_levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rll_write"    ON risk_likelihood_levels FOR INSERT WITH CHECK (is_system_admin());

CREATE POLICY "rcl_select"   ON risk_consequence_levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rcl_write"    ON risk_consequence_levels FOR INSERT WITH CHECK (is_system_admin());

CREATE POLICY "rmt_select"   ON risk_matrix_thresholds FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rmt_write"    ON risk_matrix_thresholds FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "rmt_update"   ON risk_matrix_thresholds FOR UPDATE USING (is_system_admin());

-- =============================================================
-- RISKS
-- =============================================================

-- Risk owner sees their own
CREATE POLICY "risk_select_owner" ON risks FOR SELECT
  USING (owner_id = auth.uid() OR created_by = auth.uid());

-- Workers: read-only at their assigned sites (safety awareness)
CREATE POLICY "risk_select_worker" ON risks FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND status = 'active'
    AND can_access_site(site_id)
  );

-- Supervisor: all risks at accessible sites
CREATE POLICY "risk_select_supervisor" ON risks FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE / Executive / Admin: full org
CREATE POLICY "risk_select_elevated" ON risks FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

-- Supervisor / HSE / Admin can create formal risks
CREATE POLICY "risk_insert" ON risks FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- Risk owner can update their own risk
CREATE POLICY "risk_update_owner" ON risks FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND organisation_id = get_my_organisation_id()
  );

-- Supervisor: update risks at their sites
CREATE POLICY "risk_update_supervisor" ON risks FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE / Admin: full org update
CREATE POLICY "risk_update_elevated" ON risks FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "risk_delete" ON risks FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- RISK CONTROLS
-- =============================================================

CREATE POLICY "rc_select" ON risk_controls FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND EXISTS (
      SELECT 1 FROM risks r WHERE r.id = risk_id
        AND (r.owner_id = auth.uid() OR can_access_site(r.site_id)
             OR is_hse_officer() OR is_system_admin() OR is_executive())
    )
  );

CREATE POLICY "rc_insert" ON risk_controls FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor()
         OR EXISTS (SELECT 1 FROM risks WHERE id = risk_id AND owner_id = auth.uid()))
  );

CREATE POLICY "rc_update" ON risk_controls FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor()
         OR EXISTS (SELECT 1 FROM risks WHERE id = risk_id AND owner_id = auth.uid())
         OR assigned_to = auth.uid())
  );

-- =============================================================
-- RISK REVIEWS
-- =============================================================

CREATE POLICY "rr_select" ON risk_reviews FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      reviewer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM risks r WHERE r.id = risk_id AND r.owner_id = auth.uid())
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
      OR is_executive()
    )
  );

CREATE POLICY "rr_insert" ON risk_reviews FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor()
         OR EXISTS (SELECT 1 FROM risks WHERE id = risk_id AND owner_id = auth.uid()))
  );

CREATE POLICY "rr_update" ON risk_reviews FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      reviewer_id = auth.uid()
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- =============================================================
-- RISK LINKED INCIDENTS
-- =============================================================

CREATE POLICY "rli_select" ON risk_linked_incidents FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor()
      OR EXISTS (SELECT 1 FROM risks WHERE id = risk_id AND owner_id = auth.uid())
    )
  );

CREATE POLICY "rli_insert" ON risk_linked_incidents FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor()
         OR EXISTS (SELECT 1 FROM risks WHERE id = risk_id AND owner_id = auth.uid()))
  );

CREATE POLICY "rli_delete" ON risk_linked_incidents FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- HAZARD REPORTS
-- Every worker can submit; supervisor/HSE review and action.
-- =============================================================

-- Reporter sees their own
CREATE POLICY "hr_select_own" ON hazard_reports FOR SELECT
  USING (reported_by = auth.uid());

-- Supervisor: reports at their accessible sites
CREATE POLICY "hr_select_supervisor" ON hazard_reports FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE / Admin: full org
CREATE POLICY "hr_select_elevated" ON hazard_reports FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- Any org member can submit a hazard report
CREATE POLICY "hr_insert" ON hazard_reports FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());

-- Only supervisor/HSE/admin can update (review, action, promote)
CREATE POLICY "hr_update" ON hazard_reports FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer()
         OR (is_supervisor() AND (site_id IS NULL OR can_access_site(site_id))))
  );

-- =============================================================
-- HAZARD REPORT EVIDENCE
-- =============================================================

CREATE POLICY "hre_select" ON hazard_report_evidence FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      EXISTS (SELECT 1 FROM hazard_reports WHERE id = report_id AND reported_by = auth.uid())
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

CREATE POLICY "hre_insert" ON hazard_report_evidence FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      EXISTS (SELECT 1 FROM hazard_reports WHERE id = report_id AND reported_by = auth.uid())
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

CREATE POLICY "hre_delete" ON hazard_report_evidence FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );
