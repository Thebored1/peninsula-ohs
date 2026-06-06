-- =============================================================
-- MODULE 4: Row Level Security — Incident Management
-- =============================================================
-- Access matrix:
--
--   incidents
--     Worker      → INSERT own draft; SELECT incidents they submitted
--                   or are listed as a person_involved
--     Supervisor  → SELECT/UPDATE incidents at their accessible sites
--     HSE Officer → Full SELECT/UPDATE/DELETE across org
--     Executive   → SELECT only across org
--     System Admin→ Full access
--
--   investigation workspace (investigations, rca_*, evidence, witnesses, medical)
--     Assigned investigator → full access to their investigation
--     HSE Officer / Admin   → full org access
--     Supervisor            → read-only at their sites
--
--   incident_capa
--     Assigned user → UPDATE own CAPA
--     Supervisor    → read + create at accessible sites
--     HSE Officer   → full org access
--
--   lookup tables (incident_types, severity_levels)
--     All authenticated users → SELECT (reference data)
--     System Admin only       → INSERT/UPDATE/DELETE
--
-- =============================================================

-- Helper: returns true if the current user submitted the incident
-- OR is listed as a person_involved.
CREATE OR REPLACE FUNCTION is_involved_in_incident(p_incident_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM incidents
    WHERE id = p_incident_id AND submitted_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM incident_people_involved
    WHERE incident_id = p_incident_id AND user_id = auth.uid()
  );
$$;

-- Helper: returns true if the current user is the investigator
-- or a co-investigator for this incident's investigation.
CREATE OR REPLACE FUNCTION is_investigator_for_incident(p_incident_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM investigations
    WHERE incident_id    = p_incident_id
      AND (
        investigator_id  = auth.uid()
        OR auth.uid() = ANY(co_investigator_ids)
      )
  );
$$;

-- =============================================================
-- ENABLE RLS
-- =============================================================

ALTER TABLE incident_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE severity_levels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_people_involved ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_witnesses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence      ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_medical       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca_five_whys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca_fishbone           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca_fishbone_causes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_capa          ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_counters     ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- LOOKUP TABLES — reference data
-- =============================================================

-- incident_types: readable by all, writable by System Admin only
CREATE POLICY "it_select" ON incident_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "it_insert" ON incident_types FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "it_update" ON incident_types FOR UPDATE USING (is_system_admin());
CREATE POLICY "it_delete" ON incident_types FOR DELETE USING (is_system_admin());

-- severity_levels: same pattern
CREATE POLICY "sl_select" ON severity_levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sl_insert" ON severity_levels FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "sl_update" ON severity_levels FOR UPDATE USING (is_system_admin());
CREATE POLICY "sl_delete" ON severity_levels FOR DELETE USING (is_system_admin());

-- reference_counters: internal only — no user-level access
-- SECURITY DEFINER functions handle all reads/writes

-- =============================================================
-- INCIDENTS
-- =============================================================

-- Workers: submit new incidents (draft or submitted status)
CREATE POLICY "inc_insert" ON incidents FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND status IN ('draft', 'submitted')
  );

-- Workers: see incidents they submitted or are involved in
CREATE POLICY "inc_select_own" ON incidents FOR SELECT
  USING (is_involved_in_incident(id));

-- Supervisor: see all incidents at their accessible sites
CREATE POLICY "inc_select_supervisor" ON incidents FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND can_access_site(site_id)
    AND is_supervisor()
  );

-- HSE Officer / Executive: see all incidents in their org
CREATE POLICY "inc_select_elevated" ON incidents FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

-- Workers: can update their own draft incidents before submission
CREATE POLICY "inc_update_own_draft" ON incidents FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status = 'draft'
  );

-- Supervisor: can triage + update incidents at their sites
CREATE POLICY "inc_update_supervisor" ON incidents FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND can_access_site(site_id)
    AND (is_supervisor() OR assigned_to = auth.uid())
  );

-- HSE Officer / Admin: full update across org
CREATE POLICY "inc_update_elevated" ON incidents FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- Only System Admin can delete (soft-delete via cancelled status is preferred)
CREATE POLICY "inc_delete" ON incidents FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- INCIDENT PEOPLE INVOLVED
-- =============================================================

CREATE POLICY "ipi_select_own" ON incident_people_involved FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_involved_in_incident(incident_id)
  );

CREATE POLICY "ipi_select_elevated" ON incident_people_involved FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "ipi_insert" ON incident_people_involved FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_id
        AND (i.submitted_by = auth.uid() OR is_hse_officer() OR is_system_admin() OR is_supervisor())
    )
  );

CREATE POLICY "ipi_update" ON incident_people_involved FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- =============================================================
-- INCIDENT WITNESSES
-- =============================================================

CREATE POLICY "iw_select" ON incident_witnesses FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_involved_in_incident(incident_id)
      OR is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
      OR is_supervisor()
    )
  );

CREATE POLICY "iw_insert" ON incident_witnesses FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_involved_in_incident(incident_id)
      OR is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

CREATE POLICY "iw_update" ON incident_witnesses FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- =============================================================
-- INCIDENT EVIDENCE
-- =============================================================

CREATE POLICY "ie_select" ON incident_evidence FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_involved_in_incident(incident_id)
      OR is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
      OR is_supervisor()
    )
  );

CREATE POLICY "ie_insert" ON incident_evidence FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_involved_in_incident(incident_id)
      OR is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- Evidence is immutable once submitted (no UPDATE/DELETE for regular users)
CREATE POLICY "ie_delete_admin" ON incident_evidence FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- INCIDENT MEDICAL
-- =============================================================

-- Sensitive — only the injured person, investigators, HSE, admin
CREATE POLICY "im_select" ON incident_medical FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      EXISTS (
        SELECT 1 FROM incident_people_involved ipi
        WHERE ipi.id = person_involved_id AND ipi.user_id = auth.uid()
      )
      OR is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

CREATE POLICY "im_insert" ON incident_medical FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_investigator_for_incident(incident_id)
      OR is_hse_officer()
      OR is_system_admin()
      OR is_involved_in_incident(incident_id)
    )
  );

CREATE POLICY "im_update" ON incident_medical FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_hse_officer() OR is_system_admin() OR is_investigator_for_incident(incident_id))
  );

-- =============================================================
-- INCIDENT STATUS HISTORY (append-only)
-- =============================================================

CREATE POLICY "ish_select" ON incident_status_history FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_involved_in_incident(incident_id)
      OR is_investigator_for_incident(incident_id)
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
      OR is_executive()
    )
  );

-- =============================================================
-- INVESTIGATIONS
-- =============================================================

CREATE POLICY "inv_select" ON investigations FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      investigator_id = auth.uid()
      OR auth.uid() = ANY(co_investigator_ids)
      OR is_hse_officer()
      OR is_system_admin()
      OR is_executive()
      OR (is_supervisor() AND EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.id = incident_id AND can_access_site(i.site_id)
      ))
    )
  );

CREATE POLICY "inv_insert" ON investigations FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "inv_update" ON investigations FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      investigator_id = auth.uid()
      OR auth.uid() = ANY(co_investigator_ids)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- =============================================================
-- RCA TABLES — scoped by investigation access
-- =============================================================

-- Shared sub-expression: can the current user access this investigation?
-- Inline it to avoid redundancy.

CREATE POLICY "rfw_select" ON rca_five_whys FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM investigations inv WHERE inv.id = investigation_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin() OR is_executive())
  ));

CREATE POLICY "rfw_write" ON rca_five_whys FOR INSERT WITH CHECK (
  organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM investigations inv WHERE inv.id = investigation_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin())
  ));

CREATE POLICY "rfw_update" ON rca_five_whys FOR UPDATE USING (
  organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM investigations inv WHERE inv.id = investigation_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin())
  ));

CREATE POLICY "rfb_select" ON rca_fishbone FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM investigations inv WHERE inv.id = investigation_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin() OR is_executive())
  ));

CREATE POLICY "rfb_write" ON rca_fishbone FOR INSERT WITH CHECK (
  organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM investigations inv WHERE inv.id = investigation_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin())
  ));

CREATE POLICY "rfb_update" ON rca_fishbone FOR UPDATE USING (
  organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM investigations inv WHERE inv.id = investigation_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin())
  ));

CREATE POLICY "rfbc_select" ON rca_fishbone_causes FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM rca_fishbone rfb
    JOIN investigations inv ON inv.id = rfb.investigation_id
    WHERE rfb.id = fishbone_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin() OR is_executive())
  ));

CREATE POLICY "rfbc_write" ON rca_fishbone_causes FOR INSERT WITH CHECK (
  organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM rca_fishbone rfb
    JOIN investigations inv ON inv.id = rfb.investigation_id
    WHERE rfb.id = fishbone_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin())
  ));

CREATE POLICY "rfbc_update" ON rca_fishbone_causes FOR UPDATE USING (
  organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM rca_fishbone rfb
    JOIN investigations inv ON inv.id = rfb.investigation_id
    WHERE rfb.id = fishbone_id
      AND (inv.investigator_id = auth.uid() OR auth.uid() = ANY(inv.co_investigator_ids)
           OR is_hse_officer() OR is_system_admin())
  ));

-- =============================================================
-- INCIDENT CAPA
-- =============================================================

CREATE POLICY "capa_select_own" ON incident_capa FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "capa_select_supervisor" ON incident_capa FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_id AND can_access_site(i.site_id)
    )
  );

CREATE POLICY "capa_select_elevated" ON incident_capa FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

CREATE POLICY "capa_insert" ON incident_capa FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_system_admin() OR is_hse_officer() OR is_supervisor()
      OR is_investigator_for_incident(incident_id)
    )
  );

-- Assigned user can update their own CAPA (mark complete, add notes)
CREATE POLICY "capa_update_assignee" ON incident_capa FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND status NOT IN ('verified', 'closed')
  );

CREATE POLICY "capa_update_elevated" ON incident_capa FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- =============================================================
-- REGULATORY SUBMISSIONS
-- Highly sensitive — HSE Officer and System Admin only.
-- =============================================================

CREATE POLICY "rs_select" ON regulatory_submissions FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "rs_insert" ON regulatory_submissions FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "rs_update" ON regulatory_submissions FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );
