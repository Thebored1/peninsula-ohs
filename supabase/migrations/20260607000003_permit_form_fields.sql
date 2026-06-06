ALTER TABLE permits ADD COLUMN IF NOT EXISTS isolation_requirements TEXT;
ALTER TABLE permits ADD COLUMN IF NOT EXISTS pre_work_checklist_completed BOOLEAN DEFAULT false;
ALTER TABLE permits ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE permits ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES user_profiles(id);

CREATE TABLE IF NOT EXISTS permit_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  hazard_description TEXT NOT NULL,
  risk_level TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS permit_control_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  control_description TEXT NOT NULL,
  control_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS permit_ppe_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  ppe_item TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS permit_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES user_profiles(id),
  worker_name TEXT NOT NULL,
  role_on_permit TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS permit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  approver_role TEXT NOT NULL,
  approver_id UUID REFERENCES user_profiles(id),
  sequence_order INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permit_hazards') THEN
    ALTER TABLE permit_hazards ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "ph_sel" ON permit_hazards FOR ALL USING (permit_id IN (SELECT id FROM permits WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permit_control_measures') THEN
    ALTER TABLE permit_control_measures ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "pcm_sel" ON permit_control_measures FOR ALL USING (permit_id IN (SELECT id FROM permits WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permit_ppe_requirements') THEN
    ALTER TABLE permit_ppe_requirements ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "pppe_sel" ON permit_ppe_requirements FOR ALL USING (permit_id IN (SELECT id FROM permits WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permit_workers') THEN
    ALTER TABLE permit_workers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "pw_sel" ON permit_workers FOR ALL USING (permit_id IN (SELECT id FROM permits WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permit_approvals') THEN
    ALTER TABLE permit_approvals ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "pa_sel" ON permit_approvals FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
END $$;
