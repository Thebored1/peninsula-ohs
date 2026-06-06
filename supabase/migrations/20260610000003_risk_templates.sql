-- Gap 5: Risk templates support
ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS template_industry TEXT;
-- Allow NULL organisation_id for system templates
ALTER TABLE risks ALTER COLUMN organisation_id DROP NOT NULL;

-- Update RLS to allow reading system templates (organisation_id IS NULL)
DROP POLICY IF EXISTS "org_risks" ON risks;
CREATE POLICY "org_risks" ON risks FOR ALL USING (
  organisation_id IS NULL  -- system templates readable by all
  OR organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())
);
