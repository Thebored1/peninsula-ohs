CREATE TABLE IF NOT EXISTS emergency_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  colour_code TEXT DEFAULT '#da1e28',
  display_order INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS emergency_response_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan_number TEXT,
  title TEXT NOT NULL,
  emergency_type_id UUID REFERENCES emergency_types(id),
  site_id UUID REFERENCES sites(id),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','under_review','archived')),
  version_number TEXT DEFAULT '1.0',
  last_reviewed_date DATE,
  next_review_date DATE,
  approved_by UUID REFERENCES user_profiles(id),
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS erp_response_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES emergency_response_plans(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  action TEXT NOT NULL,
  responsible_role TEXT,
  timeframe TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS muster_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id),
  name TEXT NOT NULL,
  description TEXT,
  location_description TEXT,
  capacity INT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS emergency_wardens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  warden_type TEXT NOT NULL CHECK (warden_type IN ('chief_warden','area_warden','first_aid_officer','deputy_warden')),
  area TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS emergency_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES emergency_response_plans(id),
  site_id UUID REFERENCES sites(id),
  drill_number TEXT,
  title TEXT NOT NULL,
  scheduled_date DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  drill_type TEXT DEFAULT 'evacuation',
  participants_count INT,
  duration_minutes INT,
  outcomes TEXT,
  findings TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS emergency_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  plan_id UUID REFERENCES emergency_response_plans(id),
  activation_number TEXT,
  emergency_type TEXT NOT NULL,
  description TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  all_clear_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','all_clear','closed')),
  activated_by UUID REFERENCES user_profiles(id),
  total_personnel INT,
  accounted_for INT,
  linked_incident_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_erp_org ON emergency_response_plans(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ea_org_status ON emergency_activations(organisation_id, status);
