CREATE TABLE IF NOT EXISTS toolbox_talk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  colour_code TEXT DEFAULT '#525252',
  display_order INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS toolbox_talk_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id UUID REFERENCES toolbox_talk_categories(id),
  description TEXT,
  estimated_duration_minutes INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS toolbox_talk_template_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES toolbox_talk_templates(id) ON DELETE CASCADE,
  point_number INT NOT NULL,
  point_text TEXT NOT NULL,
  point_type TEXT DEFAULT 'key_point' CHECK (point_type IN ('key_point','discussion_question','action_item')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS toolbox_talk_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  delivery_number TEXT,
  template_id UUID REFERENCES toolbox_talk_templates(id),
  title TEXT NOT NULL,
  site_id UUID REFERENCES sites(id),
  delivered_by UUID REFERENCES user_profiles(id),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT,
  notes TEXT,
  photo_url TEXT,
  photo_file_name TEXT,
  linked_incident_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS toolbox_talk_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES toolbox_talk_deliveries(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES user_profiles(id),
  attendee_name TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  signature_obtained BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS toolbox_talk_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES toolbox_talk_templates(id),
  title TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  site_id UUID REFERENCES sites(id),
  assigned_to UUID REFERENCES user_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_ttd_org ON toolbox_talk_deliveries(organisation_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_ttt_org ON toolbox_talk_templates(organisation_id);
