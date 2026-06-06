-- =============================================================
-- MODULE 8: Seed Data — Asset Management
-- =============================================================

INSERT INTO asset_types (code, name, description, icon, display_order) VALUES
  ('machinery',       'Machinery / Equipment',        'Fixed or semi-fixed industrial machinery and process equipment.', 'settings', 1),
  ('vehicle',         'Vehicle / Mobile Plant',       'Road vehicles, forklifts, excavators, and other mobile plant.', 'truck', 2),
  ('tool',            'Portable Tool / Equipment',    'Hand tools, power tools, and portable test/measurement equipment.', 'tool', 3),
  ('ppe',             'Personal Protective Equipment','Harnesses, SCBA, gas monitors, and other monitored PPE items.', 'shield', 4),
  ('infrastructure',  'Infrastructure / Facility',    'Structures, platforms, pressure vessels, pipework, and fixed installations.', 'home', 5),
  ('electrical',      'Electrical Equipment',         'Switchboards, transformers, generators, and electrical distribution equipment.', 'zap', 6),
  ('fire_safety',     'Fire Safety Equipment',        'Extinguishers, hose reels, sprinkler systems, and fire detection equipment.', 'flame', 7),
  ('first_aid',       'First Aid Equipment',          'Defibrillators, first aid kits, stretchers, and emergency response equipment.', 'heart', 8),
  ('it_comms',        'IT / Communications',          'Radios, computers, CCTV systems, and communications infrastructure.', 'wifi', 9),
  ('environmental',   'Environmental Equipment',      'Spill containment, water treatment, emissions monitoring, and waste management equipment.', 'leaf', 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO asset_statuses (code, name, description, colour_code, is_operational, display_order) VALUES
  ('operational',        'Operational',         'Available and fit for use.',                                '#22c55e', true,  1),
  ('in_use',             'In Use',              'Currently being operated.',                                '#3b82f6', true,  2),
  ('pending_inspection', 'Pending Inspection',  'Requires inspection before it can be used.',               '#eab308', false, 3),
  ('under_maintenance',  'Under Maintenance',   'Scheduled or unscheduled maintenance in progress.',        '#f97316', false, 4),
  ('out_of_service',     'Out of Service',      'Flagged unsafe — locked from use until returned to service.', '#ef4444', false, 5),
  ('on_loan',            'On Loan',             'Temporarily assigned to another site or party.',           '#8b5cf6', false, 6),
  ('decommissioned',     'Decommissioned',      'Permanently retired from service.',                        '#6b7280', false, 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO maintenance_types (code, name, description, is_preventive, display_order) VALUES
  ('preventive',  'Preventive Maintenance', 'Scheduled maintenance to prevent failure.', true,  1),
  ('inspection',  'Routine Inspection',     'Periodic inspection or service check.',     true,  2),
  ('calibration', 'Calibration',            'Measurement or adjustment to specification.', true, 3),
  ('corrective',  'Corrective Repair',      'Unscheduled repair following a failure.',   false, 4),
  ('emergency',   'Emergency Repair',       'Urgent repair to restore service.',         false, 5),
  ('overhaul',    'Major Overhaul',         'Comprehensive rebuild or major refurbishment.', false, 6),
  ('upgrade',     'Modification / Upgrade', 'Engineering modification or capability upgrade.', false, 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO asset_document_types (code, name, requires_expiry, display_order) VALUES
  ('manual',           'Operators Manual',          false, 1),
  ('service_manual',   'Service Manual',            false, 2),
  ('certificate',      'Certificate / Compliance',  true,  3),
  ('warranty',         'Warranty Document',         true,  4),
  ('datasheet',        'Technical Datasheet',       false, 5),
  ('inspection_report','Inspection Report',         false, 6),
  ('registration',     'Registration / Licence',    true,  7),
  ('calibration_cert', 'Calibration Certificate',   true,  8)
ON CONFLICT (code) DO NOTHING;

-- Notification templates
INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'assets.out_of_service',
   'Asset Flagged Out of Service',
   'Asset out of service: {{asset_name}} ({{asset_number}})',
   'An asset has been flagged as out of service and requires attention.

Asset: {{asset_name}} ({{asset_number}})
Reason: {{reason}}

Log in to review the asset record and assign corrective maintenance.',
   '{"asset_number":"Asset reference","asset_name":"Asset name","reason":"Reason for OOS"}', true),

  (NULL, 'assets.inspection_overdue',
   'Asset Inspection Overdue',
   'Inspection overdue: {{asset_name}}',
   'The scheduled inspection for {{asset_name}} ({{asset_number}}) is overdue. Please arrange an inspection as soon as possible.',
   '{"asset_number":"Asset reference","asset_name":"Asset name"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- Permissions
INSERT INTO permissions (module, action, description) VALUES
  ('assets', 'create',  'Register a new asset'),
  ('assets', 'read',    'View asset register'),
  ('assets', 'update',  'Edit asset records'),
  ('assets', 'delete',  'Decommission or delete assets'),
  ('assets', 'flag_oos','Flag an asset out of service'),
  ('assets', 'export',  'Export asset register'),
  ('maintenance', 'create', 'Log maintenance records'),
  ('maintenance', 'read',   'View maintenance history'),
  ('maintenance', 'update', 'Edit maintenance records')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (('assets','read'))
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('assets','create'),('assets','read'),('assets','update'),('assets','flag_oos'),('assets','export'),
    ('maintenance','create'),('maintenance','read'),('maintenance','update')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND (p.module, p.action) IN (
    ('assets','create'),('assets','read'),('assets','update'),('assets','delete'),
    ('assets','flag_oos'),('assets','export'),
    ('maintenance','create'),('maintenance','read'),('maintenance','update')
  )
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('assets','read'),('assets','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module IN ('assets','maintenance')
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
