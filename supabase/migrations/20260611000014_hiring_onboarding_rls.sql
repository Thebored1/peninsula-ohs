-- =============================================================
-- HIRING MODULE: Onboarding Checklists — RLS
-- =============================================================

ALTER TABLE onboarding_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_template_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_task_completions ENABLE ROW LEVEL SECURITY;

-- ─── onboarding_templates ─────────────────────────────────────────────────────

CREATE POLICY "ont_select" ON onboarding_templates FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "ont_insert" ON onboarding_templates FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ont_update" ON onboarding_templates FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ont_delete" ON onboarding_templates FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- ─── onboarding_template_tasks ────────────────────────────────────────────────

CREATE POLICY "ott_select" ON onboarding_template_tasks FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "ott_insert" ON onboarding_template_tasks FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ott_update" ON onboarding_template_tasks FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ott_delete" ON onboarding_template_tasks FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- ─── onboarding_assignments ───────────────────────────────────────────────────

CREATE POLICY "oa_select" ON onboarding_assignments FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "oa_insert" ON onboarding_assignments FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "oa_update" ON onboarding_assignments FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "oa_delete" ON onboarding_assignments FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- ─── onboarding_task_completions ──────────────────────────────────────────────

CREATE POLICY "otc_select" ON onboarding_task_completions FOR SELECT
  USING (organisation_id = get_my_organisation_id());

-- Workers can mark their own tasks; managers/HR can mark any
CREATE POLICY "otc_insert" ON onboarding_task_completions FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      is_system_admin() OR is_hse_officer() OR is_supervisor()
      OR worker_id = auth.uid()
    )
  );

CREATE POLICY "otc_update" ON onboarding_task_completions FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_system_admin() OR is_hse_officer() OR is_supervisor()
      OR worker_id = auth.uid()
    )
  );

CREATE POLICY "otc_delete" ON onboarding_task_completions FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );
