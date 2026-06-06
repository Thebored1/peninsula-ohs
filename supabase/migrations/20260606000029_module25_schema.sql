-- =============================================================
-- MODULE 25: Mental Health & Wellbeing — Schema
-- =============================================================
-- Supports wellbeing resources (EAP, helplines, policies),
-- anonymous employee check-ins (mood/stress/energy), and
-- organisation-run wellbeing programs.
--
-- Tables (3):
--   wellbeing_resources   — EAP providers, helplines, internal support
--   wellbeing_check_ins   — anonymous mood / stress / energy ratings
--   wellbeing_programs    — structured wellbeing programs and initiatives
-- =============================================================

-- Mental Health & Wellbeing Module
CREATE TABLE IF NOT EXISTS wellbeing_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('eap','helpline','internal_support','article','policy','app')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website_url TEXT,
  is_external BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS wellbeing_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INT CHECK (mood_score BETWEEN 1 AND 5),
  stress_level INT CHECK (stress_level BETWEEN 1 AND 5),
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
  workload_rating INT CHECK (workload_rating BETWEEN 1 AND 5),
  free_text TEXT,
  support_requested BOOLEAN DEFAULT false,
  site_id UUID REFERENCES sites(id),
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No worker_id: anonymous
);

CREATE TABLE IF NOT EXISTS wellbeing_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  program_type TEXT CHECK (program_type IN ('eap','fitness','mindfulness','social','training','nutrition')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_wb_resources_org    ON wellbeing_resources(organisation_id) WHERE is_active = true;
CREATE INDEX idx_wb_check_ins_org    ON wellbeing_check_ins(organisation_id, check_in_date DESC);
CREATE INDEX idx_wb_check_ins_date   ON wellbeing_check_ins(check_in_date DESC);
CREATE INDEX idx_wb_programs_org     ON wellbeing_programs(organisation_id, status);
