-- PPE Issuance Tracking Module
CREATE TABLE IF NOT EXISTS ppe_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  standard_reference TEXT,
  display_order INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ppe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ppe_type_id UUID NOT NULL REFERENCES ppe_types(id),
  item_code TEXT,
  brand TEXT,
  model TEXT,
  size TEXT,
  quantity_total INT NOT NULL DEFAULT 1,
  quantity_available INT NOT NULL DEFAULT 1,
  site_id UUID REFERENCES sites(id),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS ppe_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  ppe_item_id UUID NOT NULL REFERENCES ppe_items(id),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  returned_date DATE,
  issued_by UUID REFERENCES user_profiles(id),
  condition_on_issue TEXT DEFAULT 'good' CHECK (condition_on_issue IN ('new','good','fair','poor')),
  condition_on_return TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','returned','lost','damaged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS ppe_fit_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  ppe_type_id UUID NOT NULL REFERENCES ppe_types(id),
  test_date DATE NOT NULL,
  test_type TEXT CHECK (test_type IN ('qualitative','quantitative')),
  result TEXT CHECK (result IN ('pass','fail','conditional_pass')),
  tested_by TEXT,
  next_test_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
