-- Speak-Up Anonymous Reporting Module
CREATE TABLE IF NOT EXISTS speak_up_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS speak_up_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  report_number TEXT,
  category_id UUID REFERENCES speak_up_categories(id),
  description TEXT NOT NULL,
  date_of_incident DATE,
  location TEXT,
  site_id UUID REFERENCES sites(id),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','under_review','actioned','closed')),
  assigned_to UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NOTE: No created_by/reporter_id to preserve anonymity
);

CREATE TABLE IF NOT EXISTS speak_up_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES speak_up_reports(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  responded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
