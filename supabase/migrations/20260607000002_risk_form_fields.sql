-- Risk Register form improvements
-- Adds risk_owner_id, residual assessment columns, control hierarchy, and review history table

ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_owner_id UUID REFERENCES user_profiles(id);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS residual_likelihood INT CHECK (residual_likelihood BETWEEN 1 AND 5);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS residual_consequence INT CHECK (residual_consequence BETWEEN 1 AND 5);

ALTER TABLE risk_controls ADD COLUMN IF NOT EXISTS control_hierarchy TEXT CHECK (control_hierarchy IN ('elimination','substitution','engineering','administrative','ppe'));

CREATE TABLE IF NOT EXISTS risk_review_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id               UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organisation_id       UUID NOT NULL REFERENCES organisations(id),
  reviewed_by           UUID REFERENCES user_profiles(id),
  review_date           TIMESTAMPTZ NOT NULL DEFAULT now(),
  inherent_likelihood   INT,
  inherent_consequence  INT,
  residual_likelihood   INT,
  residual_consequence  INT,
  status                TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE risk_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_risk_history" ON risk_review_history
  FOR ALL
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );
