-- =============================================================
-- HIRING MODULE: Onboarding Checklists — Triggers
-- =============================================================

CREATE TRIGGER trg_onboarding_templates_updated_at
  BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_onboarding_template_tasks_updated_at
  BEFORE UPDATE ON onboarding_template_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_onboarding_assignments_updated_at
  BEFORE UPDATE ON onboarding_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_onboarding_task_completions_updated_at
  BEFORE UPDATE ON onboarding_task_completions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
