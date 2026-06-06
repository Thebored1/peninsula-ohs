CREATE TABLE IF NOT EXISTS training_course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id),
  module_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT CHECK (content_type IN ('document','video','quiz','checklist','external_url','reading')),
  content_url TEXT,
  content_file_name TEXT,
  duration_minutes INT,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE training_course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tcm" ON training_course_modules FOR ALL USING (
  organisation_id IS NULL
  OR organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())
);
-- Allow NULL organisation_id on training_courses for system courses
ALTER TABLE training_courses ALTER COLUMN organisation_id DROP NOT NULL;
DROP POLICY IF EXISTS "org_tc" ON training_courses;
CREATE POLICY "org_tc" ON training_courses FOR ALL USING (
  organisation_id IS NULL
  OR organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())
);
