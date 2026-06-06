-- =============================================================
-- MODULE 19: Seed Data — LOTO Procedures
-- =============================================================
-- Energy types use industry-standard colours matching common
-- LOTO tag colour conventions (OSHA / AS/NZS 4024).
-- =============================================================

INSERT INTO loto_energy_types (id, name, colour_code, display_order)
VALUES
  (gen_random_uuid(), 'Electrical',  '#da1e28', 1),
  (gen_random_uuid(), 'Pneumatic',   '#0f62fe', 2),
  (gen_random_uuid(), 'Hydraulic',   '#0e6027', 3),
  (gen_random_uuid(), 'Mechanical',  '#8a3ffc', 4),
  (gen_random_uuid(), 'Thermal',     '#f1620f', 5),
  (gen_random_uuid(), 'Chemical',    '#9f1853', 6),
  (gen_random_uuid(), 'Gravity',     '#6f6f6f', 7)
ON CONFLICT (name) DO NOTHING;
