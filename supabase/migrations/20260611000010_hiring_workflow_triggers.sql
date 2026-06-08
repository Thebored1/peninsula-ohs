-- =============================================================
-- HIRING MODULE: Hiring Workflow — Triggers
-- =============================================================

-- updated_at triggers
CREATE TRIGGER trg_hires_updated_at
  BEFORE UPDATE ON hires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hire_documents_updated_at
  BEFORE UPDATE ON hire_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hire_prestart_tasks_updated_at
  BEFORE UPDATE ON hire_prestart_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── hire_number auto-generation ──────────────────────────────────────────────
-- Format: HIR-XXXX (org-scoped sequential counter)

CREATE OR REPLACE FUNCTION generate_hire_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(hire_number FROM 5) AS integer)),
    0
  ) + 1
  INTO v_next
  FROM hires
  WHERE organisation_id = NEW.organisation_id
    AND hire_number IS NOT NULL;

  NEW.hire_number := 'HIR-' || LPAD(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hires_hire_number
  BEFORE INSERT ON hires
  FOR EACH ROW
  WHEN (NEW.hire_number IS NULL)
  EXECUTE FUNCTION generate_hire_number();
