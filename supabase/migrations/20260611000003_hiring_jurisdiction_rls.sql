-- =============================================================
-- HIRING MODULE: Jurisdiction Rules — RLS
-- =============================================================

ALTER TABLE employment_jurisdiction_rules ENABLE ROW LEVEL SECURITY;

-- All org members can read system rules (org IS NULL) and their own org rules
CREATE POLICY "ejr_select" ON employment_jurisdiction_rules
  FOR SELECT USING (
    organisation_id IS NULL
    OR organisation_id = get_my_organisation_id()
  );

-- Only system admin or HSE officer can insert/update/delete org-scoped rules
CREATE POLICY "ejr_insert" ON employment_jurisdiction_rules
  FOR INSERT WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ejr_update" ON employment_jurisdiction_rules
  FOR UPDATE USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ejr_delete" ON employment_jurisdiction_rules
  FOR DELETE USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );
