-- =============================================================
-- MODULE 6: Seed Data — Inspection Types, Templates,
--           Notification Templates, Permissions, Role Mappings
-- =============================================================

-- =============================================================
-- INSPECTION TYPES
-- =============================================================

INSERT INTO inspection_types (code, name, description, icon, display_order, is_active) VALUES
  ('site_walkthrough',     'Site / Area Walkthrough',
   'General safety inspection of a site or specific area. Covers housekeeping, hazard identification, emergency equipment, and PPE compliance.',
   'map-pin', 1, true),

  ('equipment_prestart',   'Equipment Pre-Start Check',
   'Pre-operational check of machinery or equipment before use. Ensures equipment is safe and fit for purpose before the shift begins.',
   'settings', 2, true),

  ('vehicle_inspection',   'Vehicle Inspection',
   'Safety inspection of company or site vehicles including light vehicles, heavy equipment, and mobile plant.',
   'truck', 3, true),

  ('ppe_inspection',       'PPE Inspection',
   'Inspection of personal protective equipment to ensure it is in serviceable condition, correctly fitted, and appropriate for the task.',
   'shield', 4, true),

  ('housekeeping',         'Housekeeping',
   'Workplace cleanliness and order inspection. Covers storage, waste management, walkways, and general tidiness standards.',
   'home', 5, true),

  ('fire_safety',          'Fire Safety',
   'Inspection of fire prevention and suppression systems — extinguishers, hoses, smoke detectors, emergency exits, and evacuation routes.',
   'flame', 6, true),

  ('environmental',        'Environmental',
   'Inspection of environmental controls — spill kits, waste segregation, chemical storage, drainage, and environmental monitoring.',
   'leaf', 7, true),

  ('contractor_site',      'Contractor Site Inspection',
   'Verification that contractors are complying with site safety rules, induction requirements, and applicable work method statements.',
   'clipboard', 8, true)

ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- NOTIFICATION TEMPLATES
-- New events introduced by Module 6.
-- =============================================================

INSERT INTO notification_templates
  (organisation_id, trigger_event, name,
   subject_template, body_template, available_vars, is_active)
VALUES

  (NULL, 'inspections.scheduled',
   'Inspection Scheduled',
   'You have an inspection due: {{schedule_name}}',
   'An inspection has been scheduled and assigned to you.

Inspection No: {{inspection_number}}
Schedule: {{schedule_name}}
Due: {{due_date}}

Please log in to begin the inspection when ready.',
   '{"inspection_number":"Inspection reference","schedule_name":"Name of the schedule","due_date":"Due date and time"}',
   true),

  (NULL, 'inspections.submitted',
   'Inspection Completed',
   'Inspection submitted: {{inspection_number}} — {{result}}',
   'An inspection has been completed and submitted.

Inspection No: {{inspection_number}}
Template: {{inspection_name}}
Site: {{site_name}}
Score: {{score}}%
Result: {{result}}

Log in to view the full inspection report and any linked actions.',
   '{"inspection_number":"Inspection reference","inspection_name":"Template name","site_name":"Site name","score":"Score percentage","result":"Pass or Fail"}',
   true),

  (NULL, 'inspections.score_below_threshold',
   'Inspection Score Below Threshold',
   'Inspection score alert: {{inspection_number}} scored {{score}}% (threshold {{threshold}}%)',
   'An inspection has been completed with a score below the required threshold.

Inspection No: {{inspection_number}}
Template: {{inspection_name}}
Site: {{site_name}}
Score: {{score}}% (threshold: {{threshold}}%)
Failed Items: {{failed_items}}

Immediate attention may be required. Please log in to review the failed items and assign corrective actions.',
   '{"inspection_number":"Inspection reference","inspection_name":"Template name","site_name":"Site name","score":"Actual score","threshold":"Required threshold score","failed_items":"Number of failed questions"}',
   true),

  (NULL, 'inspections.overdue',
   'Inspection Overdue',
   'Overdue inspection: {{schedule_name}} at {{site_name}}',
   'The following scheduled inspection is now overdue.

Schedule: {{schedule_name}}
Site: {{site_name}}
Assigned to: {{assignee_name}}
Was due: {{due_date}}

Please ensure the inspection is completed as soon as possible.',
   '{"schedule_name":"Schedule name","site_name":"Site name","assignee_name":"Assigned conductor name","due_date":"When the inspection was due"}',
   true)

ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- =============================================================
-- NEW PERMISSIONS
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES

  -- Template library management
  ('inspection_templates', 'read',    'View inspection template library'),
  ('inspection_templates', 'manage',  'Create and edit inspection templates'),

  -- Inspection schedules
  ('inspection_schedules', 'read',    'View inspection schedules'),
  ('inspection_schedules', 'manage',  'Create and edit inspection schedules'),

  -- Conducting inspections
  ('inspections', 'create',  'Start a new inspection'),
  ('inspections', 'read',    'View inspection records'),
  ('inspections', 'update',  'Update inspection responses'),
  ('inspections', 'approve', 'Review and approve submitted inspections'),
  ('inspections', 'export',  'Export inspection records and reports'),
  ('inspections', 'delete',  'Cancel or delete inspection records')

ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS
-- =============================================================

WITH perm AS (
  SELECT id, module, action FROM permissions
),
role_ids AS (
  SELECT id, name FROM roles WHERE is_system_role = true
),

-- ---- WORKER -------------------------------------------------
-- Can conduct inspections they are assigned to
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      ('inspection_templates', 'read'),
      ('inspection_schedules', 'read'),
      ('inspections',          'create'),
      ('inspections',          'read'),
      ('inspections',          'update')
    )
),

-- ---- SUPERVISOR ---------------------------------------------
-- Full inspection management at their sites
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('inspection_templates', 'read'),
      ('inspection_schedules', 'read'),
      ('inspection_schedules', 'manage'),
      ('inspections',          'create'),
      ('inspections',          'read'),
      ('inspections',          'update'),
      ('inspections',          'approve'),
      ('inspections',          'export')
    )
),

-- ---- HSE OFFICER -------------------------------------------
-- Full inspection access including template management
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('inspection_templates', 'read'),
      ('inspection_templates', 'manage'),
      ('inspection_schedules', 'read'),
      ('inspection_schedules', 'manage'),
      ('inspections',          'create'),
      ('inspections',          'read'),
      ('inspections',          'update'),
      ('inspections',          'approve'),
      ('inspections',          'export'),
      ('inspections',          'delete')
    )
),

-- ---- EXECUTIVE ---------------------------------------------
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('inspection_templates', 'read'),
      ('inspection_schedules', 'read'),
      ('inspections',          'read'),
      ('inspections',          'export')
    )
),

-- ---- SYSTEM ADMIN ------------------------------------------
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
    AND p.module IN ('inspection_templates','inspection_schedules','inspections')
),

all_mappings AS (
  SELECT * FROM worker_perms
  UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms
  UNION ALL SELECT * FROM executive_perms
  UNION ALL SELECT * FROM system_admin_perms
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, perm_id FROM all_mappings
ON CONFLICT (role_id, permission_id) DO NOTHING;
