-- PPE Issuance Tracking Module — Seed Data

INSERT INTO ppe_types (id, name, category, standard_reference, display_order) VALUES
  (gen_random_uuid(), 'Hard Hat',          'head',             'AS/NZS 1801', 1),
  (gen_random_uuid(), 'Safety Vest',       'body',             'AS/NZS 4602', 2),
  (gen_random_uuid(), 'Safety Boots',      'feet',             'AS/NZS 2210', 3),
  (gen_random_uuid(), 'Safety Gloves',     'hands',            'AS/NZS 2161', 4),
  (gen_random_uuid(), 'Safety Glasses',    'eyes',             'AS/NZS 1337', 5),
  (gen_random_uuid(), 'Hearing Protection','ears',             'AS/NZS 1270', 6),
  (gen_random_uuid(), 'Respirator',        'respiratory',      'AS/NZS 1716', 7),
  (gen_random_uuid(), 'Safety Harness',    'fall_protection',  'AS/NZS 1891', 8),
  (gen_random_uuid(), 'Face Shield',       'face',             'AS/NZS 1337', 9)
ON CONFLICT DO NOTHING;
