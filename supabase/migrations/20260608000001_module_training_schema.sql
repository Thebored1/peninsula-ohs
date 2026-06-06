-- Training & Competency Management — Schema
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  course_type TEXT NOT NULL DEFAULT 'classroom' CHECK (course_type IN ('classroom','e_learning','on_the_job','blended','assessment')),
  duration_hours NUMERIC,
  validity_period_months INT,
  is_certification BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS training_needs_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id),
  UNIQUE(role_id, course_id)
);

CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  record_number TEXT,
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  course_id UUID NOT NULL REFERENCES training_courses(id),
  completed_date DATE NOT NULL,
  expiry_date DATE,
  delivery_method TEXT,
  provider TEXT,
  trainer_name TEXT,
  certificate_number TEXT,
  certificate_file_url TEXT,
  certificate_file_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current','expiring_soon','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS induction_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  site_id UUID REFERENCES sites(id),
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all','employees','contractors','visitors')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS induction_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES induction_programs(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS induction_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  program_id UUID NOT NULL REFERENCES induction_programs(id),
  completed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_records_worker ON training_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_training_records_org ON training_records(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON training_records(expiry_date) WHERE expiry_date IS NOT NULL;
