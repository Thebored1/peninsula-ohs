ALTER TABLE assets ADD COLUMN IF NOT EXISTS risk_classification TEXT DEFAULT 'low' CHECK (risk_classification IN ('low','medium','high','critical'));
COMMENT ON COLUMN assets.risk_classification IS 'Risk classification: low, medium, high, or critical';
