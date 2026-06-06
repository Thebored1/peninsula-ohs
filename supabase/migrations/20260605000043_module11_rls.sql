-- =============================================================
-- MODULE 11: Row Level Security — Permit to Work
-- =============================================================
-- permit_types, permit_statuses, ppe_types: all authenticated read.
-- permits: applicant sees own; supervisor at site; HSE full org.
-- Sub-tables scoped by permit access.

ALTER TABLE permit_types            ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_statuses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_types               ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_workers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_hazards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_control_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_ppe_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_approvals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_conditions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_isolation_certs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_asset_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_document_links   ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "pt2_select"  ON permit_types   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pt2_write"   ON permit_types   FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "pt2_update"  ON permit_types   FOR UPDATE USING (is_system_admin());
CREATE POLICY "ps2_select"  ON permit_statuses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ps2_write"   ON permit_statuses FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "ppe_select"  ON ppe_types       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ppe_write"   ON ppe_types       FOR INSERT WITH CHECK (is_system_admin());

-- PERMITS
CREATE POLICY "perm_select_own" ON permits FOR SELECT
  USING (applicant_id = auth.uid() OR responsible_person_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "perm_select_worker" ON permits FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (site_id IS NULL OR can_access_site(site_id))
    AND EXISTS (SELECT 1 FROM permit_workers pw WHERE pw.permit_id = id AND pw.user_id = auth.uid())
  );

CREATE POLICY "perm_select_supervisor" ON permits FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

CREATE POLICY "perm_select_elevated" ON permits FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

-- Any org member can apply for a permit
CREATE POLICY "perm_insert" ON permits FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());

-- Applicant can update their own draft permit
CREATE POLICY "perm_update_own" ON permits FOR UPDATE
  USING (
    applicant_id = auth.uid()
    AND EXISTS (SELECT 1 FROM permit_statuses ps WHERE ps.id = status_id AND ps.code IN ('draft','rejected'))
  );

CREATE POLICY "perm_update_supervisor" ON permits FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

CREATE POLICY "perm_update_elevated" ON permits FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));

-- Helper: can current user access this permit?
CREATE OR REPLACE FUNCTION can_access_permit(p_permit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM permits p
    WHERE p.id = p_permit_id
      AND (
        p.applicant_id = auth.uid()
        OR p.responsible_person_id = auth.uid()
        OR p.organisation_id = get_my_organisation_id()
           AND (is_system_admin() OR is_hse_officer() OR is_executive()
                OR (is_supervisor() AND (p.site_id IS NULL OR can_access_site(p.site_id)))
                OR EXISTS (SELECT 1 FROM permit_workers pw WHERE pw.permit_id = p_permit_id AND pw.user_id = auth.uid()))
      )
  );
$$;

-- Sub-tables all use can_access_permit()
CREATE POLICY "pw_select"    ON permit_workers          FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "pw_write"     ON permit_workers          FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND can_access_permit(permit_id));
CREATE POLICY "ph_select"    ON permit_hazards          FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "ph_write"     ON permit_hazards          FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND can_access_permit(permit_id));
CREATE POLICY "pcm_select"   ON permit_control_measures FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "pcm_write"    ON permit_control_measures FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND can_access_permit(permit_id));
CREATE POLICY "pppe_select"  ON permit_ppe_requirements FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "pppe_write"   ON permit_ppe_requirements FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND can_access_permit(permit_id));
CREATE POLICY "pcond_select" ON permit_conditions       FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "pcond_write"  ON permit_conditions       FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "pcond_update" ON permit_conditions       FOR UPDATE USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "piso_select"  ON permit_isolation_certs  FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "piso_write"   ON permit_isolation_certs  FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "piso_update"  ON permit_isolation_certs  FOR UPDATE USING (organisation_id = get_my_organisation_id() AND (is_supervisor() OR is_hse_officer() OR is_system_admin()));
CREATE POLICY "pal2_select"  ON permit_asset_links      FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "pal2_write"   ON permit_asset_links      FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND can_access_permit(permit_id));
CREATE POLICY "pdl_select"   ON permit_document_links   FOR SELECT USING (can_access_permit(permit_id));
CREATE POLICY "pdl_write"    ON permit_document_links   FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND can_access_permit(permit_id));

-- APPROVALS: approver sees their own step; elevated roles see all
CREATE POLICY "papp_select_approver" ON permit_approvals FOR SELECT
  USING (approver_id = auth.uid());
CREATE POLICY "papp_select_elevated" ON permit_approvals FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer() OR is_supervisor()));
CREATE POLICY "papp_insert" ON permit_approvals FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer() OR is_supervisor()));
CREATE POLICY "papp_update" ON permit_approvals FOR UPDATE
  USING (approver_id = auth.uid() AND decision = 'pending' OR is_hse_officer() OR is_system_admin());
