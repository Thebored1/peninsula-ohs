CREATE TABLE IF NOT EXISTS training_module_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES training_course_modules(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, worker_id)
);
ALTER TABLE training_module_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tmc" ON training_module_completions FOR ALL
  USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
-- Also allow anon reads for dev bypass
CREATE POLICY "public_read_tmc" ON training_module_completions FOR SELECT USING (true);
