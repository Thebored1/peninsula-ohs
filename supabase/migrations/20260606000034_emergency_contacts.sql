CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_ec" ON emergency_contacts FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_ec" ON emergency_contacts FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_ec" ON emergency_contacts FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_ec" ON emergency_contacts FOR DELETE USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
