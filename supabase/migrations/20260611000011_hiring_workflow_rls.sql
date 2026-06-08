-- =============================================================
-- HIRING MODULE: Hiring Workflow — RLS
-- =============================================================

ALTER TABLE hires             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_prestart_tasks ENABLE ROW LEVEL SECURITY;

-- ─── hires ────────────────────────────────────────────────────────────────────

CREATE POLICY "hires_select" ON hires FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "hires_insert" ON hires FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "hires_update" ON hires FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "hires_delete" ON hires FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- ─── hire_documents ────────────────────────────────────────────────────────────

CREATE POLICY "hire_docs_select" ON hire_documents FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "hire_docs_insert" ON hire_documents FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "hire_docs_update" ON hire_documents FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "hire_docs_delete" ON hire_documents FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- ─── hire_prestart_tasks ───────────────────────────────────────────────────────

CREATE POLICY "hpt_select" ON hire_prestart_tasks FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "hpt_insert" ON hire_prestart_tasks FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "hpt_update" ON hire_prestart_tasks FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "hpt_delete" ON hire_prestart_tasks FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );
