-- =============================================================
-- HIRING MODULE: Jurisdiction Rules — Triggers
-- =============================================================

CREATE TRIGGER trg_employment_jurisdiction_rules_updated_at
  BEFORE UPDATE ON employment_jurisdiction_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
