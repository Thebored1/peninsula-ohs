ALTER TABLE contractor_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_cc" ON contractor_companies FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE contractor_company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ccd" ON contractor_company_documents FOR ALL USING (contractor_id IN (SELECT id FROM contractor_companies WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));

ALTER TABLE prequalification_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_pa" ON prequalification_assessments FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE contractor_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_cw" ON contractor_workers FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE contractor_site_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_csal" ON contractor_site_access_log FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
