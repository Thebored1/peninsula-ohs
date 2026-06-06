-- Triggers: Regulatory Library Module

-- Timestamp trigger for regulatory_standards
CREATE OR REPLACE FUNCTION update_regulatory_standards_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_regulatory_standards_updated
  BEFORE UPDATE ON regulatory_standards
  FOR EACH ROW
  EXECUTE FUNCTION update_regulatory_standards_timestamp();
