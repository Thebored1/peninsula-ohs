-- PPE Issuance Tracking Module — Row Level Security

-- ppe_types is a shared lookup table (not org-scoped), open to all authenticated users
ALTER TABLE ppe_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppe_types_select_all" ON ppe_types FOR SELECT USING (true);
CREATE POLICY "ppe_types_insert_auth" ON ppe_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ppe_types_update_auth" ON ppe_types FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ppe_items
ALTER TABLE ppe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppe_items_org_select" ON ppe_items FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
CREATE POLICY "ppe_items_org_insert" ON ppe_items FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
CREATE POLICY "ppe_items_org_update" ON ppe_items FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ppe_issuances
ALTER TABLE ppe_issuances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppe_issuances_org_select" ON ppe_issuances FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
CREATE POLICY "ppe_issuances_org_insert" ON ppe_issuances FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
CREATE POLICY "ppe_issuances_org_update" ON ppe_issuances FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ppe_fit_tests
ALTER TABLE ppe_fit_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppe_fit_tests_org_select" ON ppe_fit_tests FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
CREATE POLICY "ppe_fit_tests_org_insert" ON ppe_fit_tests FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
CREATE POLICY "ppe_fit_tests_org_update" ON ppe_fit_tests FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));
