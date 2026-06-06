-- =============================================================
-- Hazard Report Form — additional fields
-- =============================================================

ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS observed_by UUID REFERENCES user_profiles(id);
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ;
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS hazard_category TEXT CHECK (hazard_category IN ('physical','chemical','electrical','biological','ergonomic','psychosocial','fire','environmental','other'));
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS immediate_risk_to_people BOOLEAN DEFAULT false;
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS suggested_control TEXT;
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS evidence_file_url TEXT;
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS evidence_file_name TEXT;
