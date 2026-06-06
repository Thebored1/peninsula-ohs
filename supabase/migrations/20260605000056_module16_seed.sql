-- =============================================================
-- MODULE 16: Seed Data — Health Surveillance
-- =============================================================

INSERT INTO health_surveillance_types (code, name, description, exposure_hazard, default_frequency_months, requires_baseline, icon, display_order) VALUES
  ('audiometry',          'Audiometric Testing',           'Pure-tone hearing threshold test for noise-exposed workers.',       'noise',     12, true, 'headphones', 1),
  ('spirometry',          'Lung Function (Spirometry)',     'Pulmonary function test for workers exposed to dust or fumes.',    'dust',      12, true, 'wind',       2),
  ('blood_lead',          'Blood Lead Level',              'Blood lead concentration for workers handling lead compounds.',    'lead',       6, true, 'activity',   3),
  ('blood_cholinesterase','Blood Cholinesterase',          'Enzyme activity test for workers exposed to organophosphates.',    'chemical',   3, true, 'activity',   4),
  ('chest_xray',          'Chest X-Ray',                   'Lung imaging for workers exposed to silica or asbestos.', 'silica',              24, true, 'layers',     5),
  ('biological_monitor',  'Biological Monitoring',         'Urine or blood sampling for specific chemical exposure indices.', 'chemical',   12, true, 'flask',      6),
  ('skin_assessment',     'Skin Health Assessment',        'Dermatological review for workers with dermal chemical exposure.', 'chemical',  12, true, 'hand',       7),
  ('eye_test',            'Occupational Eye Examination',  'Vision and eye health for screen work or optical hazard exposure.','optical',   24, true, 'eye',        8),
  ('musculoskeletal',     'Musculoskeletal Assessment',    'Functional capacity evaluation for manual handling roles.',        'ergonomic', 24, true, 'activity',   9),
  ('general_fitness',     'General Medical Fitness',       'Broad health check for pre-employment or safety-critical roles.', 'general',   24, true, 'heart',      10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO work_restriction_types (code, name, description, display_order) VALUES
  ('no_heavy_lifting',   'No Heavy Lifting',          'Maximum lifting weight restricted.', 1),
  ('no_heights',         'No Working at Heights',     'Not cleared for work at elevation.', 2),
  ('no_driving',         'No Operating Vehicles',     'Not cleared to operate vehicles or mobile plant.', 3),
  ('no_confined_space',  'No Confined Space Entry',   'Not cleared for confined space work.', 4),
  ('no_loud_noise',      'No High Noise Environments','Must not work in environments > 85 dB(A).', 5),
  ('no_chemicals',       'No Chemical Handling',      'Not cleared to handle hazardous chemicals.', 6),
  ('reduced_hours',      'Reduced Working Hours',     'Must not exceed specified daily/weekly hours.', 7),
  ('modified_duties',    'Modified Duties',           'Restricted to specified duties only.', 8),
  ('no_lone_working',    'No Lone Working',           'Must be supervised or work in pairs at all times.', 9),
  ('seated_duties_only', 'Seated Duties Only',        'Cannot perform standing or walking duties.', 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'health.check_due',  'Health Check Due',
   'Health check due: {{check_name}}',
   'Your scheduled health check is due within the next two weeks.

Check Type: {{check_name}}
Due Date: {{due_date}}

Please contact your HSE officer to schedule your appointment.',
   '{"check_name":"Surveillance type","due_date":"Due date"}', true),

  (NULL, 'health.check_result_action_required', 'Health Check — Action Required',
   'Health check outcome requires action: {{check_number}}',
   'A health check result requires follow-up action.

Check No: {{check_number}}
Outcome: {{result}}

Please log in to review the outcome and arrange any necessary follow-up, work restrictions, or RTW planning.',
   '{"check_number":"Check reference","result":"Outcome"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('health_surveillance', 'read_own',       'View own health surveillance records'),
  ('health_surveillance', 'read_all',       'View health surveillance records for all workers'),
  ('health_surveillance', 'manage_programs','Create and manage surveillance programs'),
  ('health_surveillance', 'record_results', 'Enter health check results'),
  ('health_surveillance', 'manage_restrictions', 'Manage work restrictions'),
  ('health_surveillance', 'manage_rtw',     'Create and manage return-to-work plans'),
  ('health_surveillance', 'export',         'Export health surveillance reports')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (('health_surveillance','read_own'))
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('health_surveillance','read_own'),('health_surveillance','read_all'),
    ('health_surveillance','manage_restrictions'),('health_surveillance','manage_rtw'),('health_surveillance','export')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND p.module = 'health_surveillance'
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('health_surveillance','read_all'),('health_surveillance','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module = 'health_surveillance'
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
