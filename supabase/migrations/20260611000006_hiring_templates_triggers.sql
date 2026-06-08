-- =============================================================
-- HIRING MODULE: HR Document Templates — Triggers
-- =============================================================

CREATE TRIGGER trg_hr_document_templates_updated_at
  BEFORE UPDATE ON hr_document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
