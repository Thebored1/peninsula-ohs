-- =============================================================
-- MODULE 14: Seed Data — Chemical Management
-- =============================================================

INSERT INTO chemical_categories (code, name, description, icon, display_order) VALUES
  ('flammable',          'Flammable',              'Flammable liquids, gases, aerosols, and solids.', 'flame',         1),
  ('oxidising',          'Oxidising',              'Oxidising agents — accelerate combustion and fire.', 'zap',         2),
  ('corrosive',          'Corrosive',              'Acids, bases, and materials that destroy living tissue.', 'droplet', 3),
  ('toxic',              'Toxic',                  'Acutely or chronically toxic to humans.', 'skull',              4),
  ('explosive',          'Explosive',              'Unstable explosives and self-reactive substances.', 'alert-circle', 5),
  ('compressed_gas',     'Compressed Gas',         'Liquefied, compressed, or dissolved gases under pressure.', 'wind', 6),
  ('environmental_haz',  'Environmental Hazard',   'Toxic to aquatic life or the wider environment.', 'leaf',          7),
  ('carcinogenic',       'Carcinogenic / CMR',     'Carcinogenic, mutagenic, or toxic to reproduction.', 'activity',   8),
  ('irritant',           'Irritant',               'Skin or respiratory irritants — lower hazard profile.', 'eye',      9),
  ('cryogenic',          'Cryogenic',              'Cryogenic liquids (LNG, liquid nitrogen, dry ice).', 'thermometer', 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO chemical_hazard_classes (code, ghs_pictogram, hazard_class, display_order) VALUES
  ('H200', 'exploding_bomb',    'Unstable explosive',                                    1),
  ('H225', 'flame',             'Flammable liquid, Category 2',                          2),
  ('H226', 'flame',             'Flammable liquid, Category 3',                          3),
  ('H228', 'flame',             'Flammable solid',                                       4),
  ('H270', 'flame_over_circle', 'Oxidising gas',                                         5),
  ('H271', 'flame_over_circle', 'Oxidising liquid or solid, Category 1',                 6),
  ('H280', 'gas_cylinder',      'Gas under pressure',                                    7),
  ('H290', 'corrosion',         'Corrosive to metals',                                   8),
  ('H300', 'skull',             'Fatal if swallowed',                                    9),
  ('H301', 'skull',             'Toxic if swallowed',                                   10),
  ('H310', 'skull',             'Fatal in contact with skin',                            11),
  ('H314', 'corrosion',         'Causes severe skin burns and eye damage',               12),
  ('H315', 'exclamation',       'Causes skin irritation',                                13),
  ('H317', 'exclamation',       'May cause an allergic skin reaction',                   14),
  ('H318', 'corrosion',         'Causes serious eye damage',                             15),
  ('H319', 'exclamation',       'Causes serious eye irritation',                         16),
  ('H330', 'skull',             'Fatal if inhaled',                                      17),
  ('H331', 'skull',             'Toxic if inhaled',                                      18),
  ('H332', 'exclamation',       'Harmful if inhaled',                                    19),
  ('H334', 'health_hazard',     'May cause allergy or asthma symptoms if inhaled',       20),
  ('H340', 'health_hazard',     'May cause genetic defects',                             21),
  ('H350', 'health_hazard',     'May cause cancer',                                      22),
  ('H360', 'health_hazard',     'May damage fertility or the unborn child',              23),
  ('H370', 'health_hazard',     'Causes damage to organs',                               24),
  ('H400', 'environment',       'Very toxic to aquatic life',                            25),
  ('H410', 'environment',       'Very toxic to aquatic life with long lasting effects',  26)
ON CONFLICT (code) DO NOTHING;

INSERT INTO chemical_physical_states (code, name, display_order) VALUES
  ('liquid',   'Liquid',   1),
  ('solid',    'Solid',    2),
  ('gas',      'Gas',      3),
  ('aerosol',  'Aerosol',  4),
  ('powder',   'Powder',   5),
  ('paste',    'Paste',    6),
  ('slurry',   'Slurry',   7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'chemicals.sds_review_due',  'SDS Review Due',
   'SDS review due: {{chemical_name}} ({{chemical_number}})',
   'The Safety Data Sheet for the following chemical is due for review.

Chemical: {{chemical_name}} ({{chemical_number}})
Review Due: {{review_due}}

Please obtain the latest SDS from the manufacturer/supplier and update the record.',
   '{"chemical_number":"Chemical reference","chemical_name":"Chemical name","review_due":"Review due date"}', true),

  (NULL, 'chemicals.low_stock', 'Chemical Low Stock',
   'Low stock alert: {{chemical_name}}',
   'Stock level for {{chemical_name}} ({{chemical_number}}) has fallen below 20% of maximum.

Current Quantity: {{quantity_on_hand}}
Maximum Quantity: {{max_quantity}}

Please arrange resupply.',
   '{"chemical_number":"Chemical reference","chemical_name":"Chemical name","quantity_on_hand":"Current quantity","max_quantity":"Maximum quantity"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('chemicals', 'create',     'Register a new chemical'),
  ('chemicals', 'read',       'View chemical register and SDS'),
  ('chemicals', 'update',     'Edit chemical records and SDS'),
  ('chemicals', 'delete',     'Remove chemicals from register'),
  ('chemicals', 'log_usage',  'Record chemical usage'),
  ('chemicals', 'manage_inventory', 'Manage stock levels and transactions'),
  ('chemicals', 'export',     'Export chemical register')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (('chemicals','read'),('chemicals','log_usage'))
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('chemicals','create'),('chemicals','read'),('chemicals','update'),
    ('chemicals','log_usage'),('chemicals','manage_inventory'),('chemicals','export')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND p.module = 'chemicals'
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('chemicals','read'),('chemicals','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module = 'chemicals'
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
