-- =============================================================
-- MODULE 15: Seed Data — Environmental Monitoring
-- =============================================================

INSERT INTO env_parameter_types (code, name, description, monitoring_category, default_unit_code, icon, display_order) VALUES
  ('noise_level',         'Noise Level',              'A-weighted sound pressure level.', 'noise', 'dB_A', 'volume-2', 1),
  ('noise_dose',          'Noise Dose',               'Cumulative noise exposure as percentage of daily limit.', 'noise', 'percent', 'volume-2', 2),
  ('dust_tsp',            'Total Suspended Particulates', 'Airborne particulate matter.', 'air_quality', 'mg_m3', 'wind', 3),
  ('dust_pm10',           'Particulate Matter PM10',  'Particles ≤10 µm aerodynamic diameter.', 'air_quality', 'ug_m3', 'wind', 4),
  ('dust_pm25',           'Particulate Matter PM2.5', 'Fine particles ≤2.5 µm.', 'air_quality', 'ug_m3', 'wind', 5),
  ('voc',                 'Volatile Organic Compounds','Total VOC concentration in air.', 'air_quality', 'ppm', 'wind', 6),
  ('water_ph',            'Water pH',                 'Acidity/alkalinity of water.', 'water_quality', 'pH', 'droplet', 7),
  ('water_turbidity',     'Water Turbidity',          'Clarity of water.', 'water_quality', 'NTU', 'droplet', 8),
  ('water_do',            'Dissolved Oxygen',         'Dissolved oxygen content of water.', 'water_quality', 'mg_L', 'droplet', 9),
  ('water_conductivity',  'Water Conductivity',       'Electrical conductivity (salinity indicator).', 'water_quality', 'uS_cm', 'droplet', 10),
  ('effluent_tss',        'Total Suspended Solids',   'Solids in discharge water.', 'water_quality', 'mg_L', 'droplet', 11),
  ('soil_contamination',  'Soil Contamination',       'Contaminant concentration in soil.', 'soil', 'mg_kg', 'layers', 12),
  ('ghg_co2e',            'GHG Emissions (CO₂-e)',    'Greenhouse gas emissions in CO₂ equivalent.', 'emissions', 'tonnes', 'cloud', 13),
  ('waste_volume',        'Waste Volume',             'Total waste generated in the measurement period.', 'waste', 'tonnes', 'trash', 14)
ON CONFLICT (code) DO NOTHING;

INSERT INTO env_measurement_units (code, name, symbol, display_order) VALUES
  ('dB_A',    'Decibels (A-weighted)',     'dB(A)',    1),
  ('percent', 'Percentage',               '%',         2),
  ('mg_m3',   'Milligrams per cubic metre','mg/m³',    3),
  ('ug_m3',   'Micrograms per cubic metre','µg/m³',    4),
  ('ppm',     'Parts per million',         'ppm',      5),
  ('pH',      'pH',                        'pH',       6),
  ('NTU',     'Nephelometric Turbidity Unit','NTU',    7),
  ('mg_L',    'Milligrams per litre',      'mg/L',     8),
  ('uS_cm',   'Microsiemens per centimetre','µS/cm',   9),
  ('mg_kg',   'Milligrams per kilogram',   'mg/kg',   10),
  ('tonnes',  'Tonnes',                    't',        11),
  ('kg',      'Kilograms',                 'kg',       12),
  ('L',       'Litres',                    'L',        13),
  ('m3',      'Cubic metres',              'm³',       14)
ON CONFLICT (code) DO NOTHING;

INSERT INTO waste_categories (code, name, description, is_hazardous, requires_manifest, display_order) VALUES
  ('general',             'General Waste',           'Non-hazardous solid waste for landfill.', false, false, 1),
  ('recyclable',          'Recyclable',              'Materials suitable for recycling.', false, false, 2),
  ('organic',             'Organic / Green Waste',   'Biodegradable organic waste.', false, false, 3),
  ('liquid_non_haz',      'Liquid (Non-Hazardous)',  'Wastewater or liquid waste that is not hazardous.', false, false, 4),
  ('hazardous_chemical',  'Hazardous Chemical Waste','Waste chemicals, solvents, or contaminated materials.', true, true, 5),
  ('liquid_hazardous',    'Liquid Hazardous Waste',  'Hazardous liquid waste requiring controlled disposal.', true, true, 6),
  ('contaminated_soil',   'Contaminated Soil',       'Soil contaminated with hydrocarbons or chemicals.', true, true, 7),
  ('asbestos',            'Asbestos-Containing Material','ACM requiring licensed disposal.', true, true, 8),
  ('e_waste',             'Electronic Waste',        'Electrical and electronic equipment for recycling.', false, false, 9),
  ('medical',             'Clinical / Medical Waste','Healthcare-associated waste.', true, true, 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'environment.limit_exceeded',  'Environmental Limit Exceeded',
   'ALERT: Environmental compliance limit exceeded',
   'An environmental monitoring reading has exceeded the compliance limit.

Parameter: {{parameter_type}}
Measured Value: {{measured_value}}
Limit Reference: {{limit_reference}}

Immediate investigation is required. Log in to record findings and corrective actions.',
   '{"parameter_type":"Parameter type","measured_value":"Reading value","limit_reference":"Applicable standard"}', true),

  (NULL, 'environment.report_due', 'Environmental Report Due',
   'Environmental report due: {{requirement_name}}',
   'The following environmental report is due within {{days_to_due}} days.

Report: {{requirement_name}}
Due Date: {{due_date}}

Log in to prepare and submit the report.',
   '{"requirement_name":"Report name","due_date":"Due date","days_to_due":"Days remaining"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('environment', 'create_record',  'Record environmental monitoring readings'),
  ('environment', 'read',           'View environmental monitoring data'),
  ('environment', 'manage_limits',  'Manage compliance limits'),
  ('environment', 'manage_waste',   'Record and manage waste disposal'),
  ('environment', 'submit_reports', 'Submit regulatory reports'),
  ('environment', 'export',         'Export environmental data')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (('environment','create_record'))
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('environment','create_record'),('environment','read'),('environment','manage_waste'),('environment','export')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND p.module = 'environment'
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('environment','read'),('environment','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module = 'environment'
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
