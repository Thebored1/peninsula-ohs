-- =============================================================
-- MODULE 6: Row Level Security — Inspections & Checklists
-- =============================================================
-- Access matrix:
--
--   inspection_types / lookup tables
--     All authenticated users → SELECT (reference data)
--     System Admin            → write
--
--   inspection_templates / sections / questions
--     All org members        → SELECT (to conduct or view)
--     HSE Officer / Admin    → INSERT / UPDATE / DELETE
--
--   inspection_schedules
--     Assigned conductor     → SELECT own schedules
--     Supervisor             → SELECT/manage at their sites
--     HSE Officer / Admin    → full org access
--
--   inspections
--     Conductor              → SELECT + UPDATE their own in-progress
--     Supervisor             → SELECT all at accessible sites
--     HSE Officer / Executive/ Admin → full org SELECT
--     HSE Officer / Admin    → UPDATE (approve, cancel)
--
--   inspection_responses / evidence
--     Conductor of the inspection → full access during inspection
--     Supervisor at site         → read after completion
--     HSE Officer / Admin        → full org access
--
--   inspection_actions
--     Scoped by inspection access
-- =============================================================

-- Helper: returns true if the current user is the conductor of
-- this inspection or is an elevated role.
CREATE OR REPLACE FUNCTION is_inspection_conductor(p_inspection_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM inspections
    WHERE id = p_inspection_id AND conducted_by = auth.uid()
  );
$$;

-- =============================================================
-- ENABLE RLS
-- =============================================================

ALTER TABLE inspection_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_template_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_response_evidence  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_actions            ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- INSPECTION TYPES — reference data
-- =============================================================

CREATE POLICY "itype_select" ON inspection_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "itype_insert" ON inspection_types FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "itype_update" ON inspection_types FOR UPDATE USING (is_system_admin());
CREATE POLICY "itype_delete" ON inspection_types FOR DELETE USING (is_system_admin());

-- =============================================================
-- INSPECTION TEMPLATES
-- =============================================================

-- All org members can read published templates
CREATE POLICY "itmpl_select" ON inspection_templates FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_published = true OR is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "itmpl_insert" ON inspection_templates FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "itmpl_update" ON inspection_templates FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "itmpl_delete" ON inspection_templates FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- TEMPLATE SECTIONS
-- =============================================================

CREATE POLICY "itsc_select" ON inspection_template_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "itsc_write" ON inspection_template_sections FOR INSERT
  WITH CHECK (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "itsc_update" ON inspection_template_sections FOR UPDATE
  USING (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "itsc_delete" ON inspection_template_sections FOR DELETE
  USING (
    is_system_admin()
    AND EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

-- =============================================================
-- TEMPLATE QUESTIONS
-- =============================================================

CREATE POLICY "itq_select" ON inspection_template_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "itq_write" ON inspection_template_questions FOR INSERT
  WITH CHECK (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "itq_update" ON inspection_template_questions FOR UPDATE
  USING (
    (is_system_admin() OR is_hse_officer())
    AND EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

CREATE POLICY "itq_delete" ON inspection_template_questions FOR DELETE
  USING (
    is_system_admin()
    AND EXISTS (
      SELECT 1 FROM inspection_templates t
      WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()
    )
  );

-- =============================================================
-- INSPECTION SCHEDULES
-- =============================================================

-- Assigned conductor sees their own schedules
CREATE POLICY "isch_select_own" ON inspection_schedules FOR SELECT
  USING (assigned_to = auth.uid());

-- Supervisor: schedules at their accessible sites
CREATE POLICY "isch_select_supervisor" ON inspection_schedules FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE / Admin / Executive: full org
CREATE POLICY "isch_select_elevated" ON inspection_schedules FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

CREATE POLICY "isch_insert" ON inspection_schedules FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "isch_update" ON inspection_schedules FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer()
         OR (is_supervisor() AND (site_id IS NULL OR can_access_site(site_id))))
  );

CREATE POLICY "isch_delete" ON inspection_schedules FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- INSPECTIONS
-- =============================================================

-- Conductor sees their own inspections
CREATE POLICY "insp_select_own" ON inspections FOR SELECT
  USING (conducted_by = auth.uid() OR created_by = auth.uid());

-- Supervisor: all inspections at accessible sites
CREATE POLICY "insp_select_supervisor" ON inspections FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE / Executive / Admin: full org
CREATE POLICY "insp_select_elevated" ON inspections FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

-- Any org member can start an ad-hoc inspection
CREATE POLICY "insp_insert" ON inspections FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());

-- Conductor can update their own in-progress inspection
CREATE POLICY "insp_update_own" ON inspections FOR UPDATE
  USING (
    conducted_by = auth.uid()
    AND status NOT IN ('submitted', 'cancelled')
  );

-- Supervisor: update inspections at their sites (triage, cancel)
CREATE POLICY "insp_update_supervisor" ON inspections FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE / Admin: full org update
CREATE POLICY "insp_update_elevated" ON inspections FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- INSPECTION RESPONSES
-- =============================================================

-- Conductor fills in responses during the inspection
CREATE POLICY "ir_select" ON inspection_responses FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_inspection_conductor(inspection_id)
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
      OR is_executive()
    )
  );

CREATE POLICY "ir_insert" ON inspection_responses FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_inspection_conductor(inspection_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- Only the conductor can update responses on their own inspection
CREATE POLICY "ir_update" ON inspection_responses FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_inspection_conductor(inspection_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- =============================================================
-- INSPECTION RESPONSE EVIDENCE
-- =============================================================

CREATE POLICY "ire_select" ON inspection_response_evidence FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_inspection_conductor(inspection_id)
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
      OR is_executive()
    )
  );

CREATE POLICY "ire_insert" ON inspection_response_evidence FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_inspection_conductor(inspection_id)
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

CREATE POLICY "ire_delete" ON inspection_response_evidence FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- INSPECTION ACTIONS (links)
-- =============================================================

CREATE POLICY "ia_select" ON inspection_actions FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_inspection_conductor(inspection_id)
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
      OR is_executive()
    )
  );

-- Written only by SECURITY DEFINER create_inspection_action()
