-- RLS: Regulatory Library Module

-- regulatory_bodies: global reference table, readable by all authenticated users
ALTER TABLE regulatory_bodies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_regulatory_bodies"
  ON regulatory_bodies FOR SELECT
  TO authenticated
  USING (true);

-- regulatory_standards: scoped to organisation
ALTER TABLE regulatory_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_regulatory_standards"
  ON regulatory_standards FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_insert_regulatory_standards"
  ON regulatory_standards FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_update_regulatory_standards"
  ON regulatory_standards FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_delete_regulatory_standards"
  ON regulatory_standards FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- regulatory_requirements: access controlled via parent standard's organisation
ALTER TABLE regulatory_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_regulatory_requirements"
  ON regulatory_requirements FOR SELECT
  USING (
    standard_id IN (
      SELECT id FROM regulatory_standards
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "org_insert_regulatory_requirements"
  ON regulatory_requirements FOR INSERT
  WITH CHECK (
    standard_id IN (
      SELECT id FROM regulatory_standards
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "org_update_regulatory_requirements"
  ON regulatory_requirements FOR UPDATE
  USING (
    standard_id IN (
      SELECT id FROM regulatory_standards
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "org_delete_regulatory_requirements"
  ON regulatory_requirements FOR DELETE
  USING (
    standard_id IN (
      SELECT id FROM regulatory_standards
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
