-- =============================================================
-- MODULE 18: JSA/JHA Builder — Triggers & Functions
-- =============================================================

-- =============================================================
-- UPDATED_AT TRIGGER
-- Reuses the shared update_updated_at_column() function that
-- was created in the core bootstrap migration.
-- Only jsas has an updated_at column in this module.
-- =============================================================

CREATE TRIGGER trg_jsas_updated_at
  BEFORE UPDATE ON jsas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- JSA NUMBER GENERATION
-- Format: JSA-YYYY-NNNNN (e.g. JSA-2026-00001)
-- Uses reference_counters table shared across the platform.
-- Trigger fires BEFORE INSERT so NEW.jsa_number is set before
-- the row hits the table.
-- =============================================================

CREATE OR REPLACE FUNCTION generate_jsa_number()
RETURNS TRIGGER AS $$
DECLARE
  v_counter INT;
BEGIN
  INSERT INTO reference_counters (organisation_id, sequence_key, last_value)
  VALUES (NEW.organisation_id, 'JSA', 1)
  ON CONFLICT (organisation_id, sequence_key)
  DO UPDATE SET last_value = reference_counters.last_value + 1
  RETURNING last_value INTO v_counter;

  NEW.jsa_number := 'JSA-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_counter::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jsa_number
  BEFORE INSERT ON jsas
  FOR EACH ROW
  WHEN (NEW.jsa_number IS NULL)
  EXECUTE FUNCTION generate_jsa_number();
