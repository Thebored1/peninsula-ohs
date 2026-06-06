-- RLS for speak_up_categories (global lookup table, read-only for all)
ALTER TABLE speak_up_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all"
  ON speak_up_categories
  FOR SELECT
  USING (true);

-- RLS for speak_up_reports
ALTER TABLE speak_up_reports ENABLE ROW LEVEL SECURITY;

-- Anonymous INSERT: anyone can submit a report without authentication
CREATE POLICY "reports_insert_anonymous"
  ON speak_up_reports
  FOR INSERT
  WITH CHECK (true);

-- SELECT restricted to org members only
CREATE POLICY "reports_select_org"
  ON speak_up_reports
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- UPDATE restricted to org members only
CREATE POLICY "reports_update_org"
  ON speak_up_reports
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS for speak_up_responses
ALTER TABLE speak_up_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responses_select_org"
  ON speak_up_responses
  FOR SELECT
  USING (
    report_id IN (
      SELECT id
      FROM speak_up_reports
      WHERE organisation_id IN (
        SELECT organisation_id
        FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "responses_insert_org"
  ON speak_up_responses
  FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT id
      FROM speak_up_reports
      WHERE organisation_id IN (
        SELECT organisation_id
        FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "responses_update_org"
  ON speak_up_responses
  FOR UPDATE
  USING (
    report_id IN (
      SELECT id
      FROM speak_up_reports
      WHERE organisation_id IN (
        SELECT organisation_id
        FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );
