-- Regulatory Library Module
CREATE TABLE IF NOT EXISTS regulatory_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  acronym TEXT,
  jurisdiction TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS regulatory_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  regulatory_body_id UUID REFERENCES regulatory_bodies(id),
  standard_code TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  effective_date DATE,
  status TEXT DEFAULT 'current' CHECK (status IN ('current','superseded','withdrawn')),
  jurisdiction TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS regulatory_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES regulatory_standards(id) ON DELETE CASCADE,
  clause_reference TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirement_type TEXT DEFAULT 'shall' CHECK (requirement_type IN ('shall','should','may')),
  is_applicable BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
