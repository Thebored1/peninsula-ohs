-- Seed: Regulatory Library Module

INSERT INTO regulatory_bodies (id, name, acronym, jurisdiction) VALUES
  (gen_random_uuid(), 'Safe Work Australia', 'SWA', 'AU'),
  (gen_random_uuid(), 'International Organization for Standardization', 'ISO', 'International'),
  (gen_random_uuid(), 'Occupational Safety and Health Administration', 'OSHA', 'US'),
  (gen_random_uuid(), 'WorkSafe Victoria', 'WorkSafe VIC', 'AU-VIC'),
  (gen_random_uuid(), 'SafeWork NSW', 'SafeWork NSW', 'AU-NSW')
ON CONFLICT DO NOTHING;
