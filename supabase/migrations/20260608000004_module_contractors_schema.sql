CREATE TABLE IF NOT EXISTS contractor_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  abn TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  address TEXT,
  prequalification_status TEXT NOT NULL DEFAULT 'pending' CHECK (prequalification_status IN ('pending','approved','conditionally_approved','suspended','expired')),
  prequalification_expiry DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS contractor_company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('public_liability','workers_compensation','safety_cert','iso_cert','other')),
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  issue_date DATE,
  expiry_date DATE,
  insurer_name TEXT,
  policy_number TEXT,
  coverage_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prequalification_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessed_by UUID REFERENCES user_profiles(id),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score NUMERIC,
  decision TEXT CHECK (decision IN ('approved','rejected','conditionally_approved')),
  decision_notes TEXT,
  conditions TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contractor_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  induction_status TEXT DEFAULT 'not_inducted' CHECK (induction_status IN ('not_inducted','inducted','expired')),
  inducted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS contractor_site_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contractor_worker_id UUID NOT NULL REFERENCES contractor_workers(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  sign_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sign_out_at TIMESTAMPTZ,
  purpose TEXT,
  signed_in_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_org ON contractor_companies(organisation_id);
CREATE INDEX IF NOT EXISTS idx_cw_contractor ON contractor_workers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_csal_org ON contractor_site_access_log(organisation_id, sign_in_at DESC);
