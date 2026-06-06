-- =============================================================
-- MODULE 20: Seed Data — Compliance Calendar
-- =============================================================
-- Seed the compliance_obligation_types lookup table.
-- ON CONFLICT DO NOTHING ensures safe re-runs.
-- =============================================================

INSERT INTO compliance_obligation_types (id, name, colour_code, display_order)
VALUES
  (gen_random_uuid(), 'Legislation',       '#da1e28', 1),
  (gen_random_uuid(), 'Standard',          '#0f62fe', 2),
  (gen_random_uuid(), 'Permit Condition',  '#0e6027', 3),
  (gen_random_uuid(), 'Licence Condition', '#8a3ffc', 4),
  (gen_random_uuid(), 'Internal Policy',   '#6f6f6f', 5)
ON CONFLICT DO NOTHING;
