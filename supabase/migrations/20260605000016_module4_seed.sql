-- =============================================================
-- MODULE 4: Seed Data — Incident Types, Severity Levels,
--           Permissions & Role Mappings
-- =============================================================

-- =============================================================
-- INCIDENT TYPES
-- =============================================================

INSERT INTO incident_types (code, name, description, icon, display_order, is_active) VALUES
  ('injury_illness',       'Injury / Illness',
   'A worker is hurt or becomes ill as a direct result of work activities. Includes physical injuries, occupational diseases, and work-related mental health conditions.',
   'bandage', 1, true),

  ('near_miss',            'Near Miss',
   'An unplanned event that did not result in injury or damage but had the potential to do so. Near misses are critical leading indicators for incident prevention.',
   'alert-triangle', 2, true),

  ('property_equipment',   'Property / Equipment Damage',
   'Damage to company assets, machinery, buildings, or infrastructure. Includes both minor damage and major equipment failures.',
   'wrench', 3, true),

  ('environmental',        'Environmental',
   'An incident causing or with the potential to cause environmental harm — spills, emissions, waste mismanagement, or impact on flora and fauna.',
   'leaf', 4, true),

  ('security',             'Security',
   'Incidents involving theft, assault, threats, unauthorised access to facilities or systems, or any breach of workplace security.',
   'shield', 5, true),

  ('vehicle',              'Vehicle',
   'Collisions, rollovers, or any incident involving company or site vehicles — including forklifts, heavy equipment, light vehicles, and contractor transport.',
   'truck', 6, true)

ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- SEVERITY LEVELS
-- Level determines notification recipients, investigation depth,
-- regulatory requirements, and response SLA.
-- =============================================================

INSERT INTO severity_levels (
  level_number, name, description, colour_code,
  investigation_required, regulatory_reporting_required,
  response_required_within_hours, notify_executive, is_active
) VALUES
  (1, 'Minor',
   'First aid treatment only. No lost time, no hospitalisation. Examples: minor cuts, bruises, small spills contained immediately.',
   '#22c55e',  -- green
   false, false, 48, false, true),

  (2, 'Moderate',
   'Medical treatment required beyond first aid. Restricted work duties or limited lost time (< 3 days). Examples: lacerations requiring stitches, sprains, contained chemical exposure.',
   '#eab308',  -- yellow
   true, false, 24, false, true),

  (3, 'Serious',
   'Hospitalisation required, significant lost time (≥ 3 days), or permanent partial disability. Examples: fractures, serious burns, significant chemical exposure, major equipment damage.',
   '#f97316',  -- orange
   true, true, 4, false, true),

  (4, 'Critical',
   'Fatality, permanent total disability, or catastrophic event. Immediate regulatory notification mandatory. Examples: fatality, permanent blindness or amputation, major structural failure, large-scale environmental incident.',
   '#ef4444',  -- red
   true, true, 1, true, true)

ON CONFLICT (level_number) DO NOTHING;

-- =============================================================
-- NOTIFICATION TEMPLATES (Module 3 stubs for Module 4 events)
-- Fills in the incident templates seeded in Module 3 plus
-- adds templates for the new events introduced here.
-- =============================================================

INSERT INTO notification_templates
  (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active)
VALUES

  (NULL, 'incidents.triaged',
   'Incident Triaged',
   'Incident {{incident_number}} triaged as {{severity_level}} severity',
   'Incident {{incident_number}} — "{{incident_title}}" — has been triaged.

Severity: {{severity_level}}
Site: {{site_name}}
Assigned investigator: {{assigned_to_name}}

{{#if regulatory_required}}This incident may require regulatory notification. Please review the regulatory requirements.{{/if}}

Log in to view the full incident record and begin the investigation.',
   '{"incident_number":"Incident reference","incident_title":"Incident title","severity_level":"Assigned severity level","site_name":"Site name","assigned_to_name":"Assigned investigator name","regulatory_required":"Whether regulatory notification is required"}',
   true),

  (NULL, 'incidents.investigation_assigned',
   'Investigation Assigned',
   'You have been assigned to investigate {{incident_number}}',
   'You have been assigned as the lead investigator for the following incident.

Investigation No: {{investigation_number}}
Incident: {{incident_reference}} — {{incident_title}}
Site: {{site_name}}
Target completion: {{target_date}}

Please log in to begin the investigation, review evidence, and complete the Root Cause Analysis.',
   '{"investigation_number":"Investigation reference","incident_reference":"Incident number","incident_title":"Incident title","site_name":"Site name","target_date":"Target completion date"}',
   true),

  (NULL, 'incidents.capa_assigned',
   'Corrective Action Assigned',
   'Action assigned to you: {{capa_number}} — {{action_title}}',
   'A corrective action has been assigned to you.

CAPA No: {{capa_number}}
Action: {{action_title}}
Related Incident: {{incident_reference}}
Site: {{site_name}}
Due Date: {{due_date}}

Please log in to review the action details and update progress.',
   '{"capa_number":"CAPA reference number","action_title":"Title of the action","incident_reference":"Incident reference","site_name":"Site name","due_date":"Due date for completion"}',
   true),

  (NULL, 'incidents.closed',
   'Incident Closed',
   'Incident {{incident_number}} has been closed',
   'The following incident has been reviewed, investigated, and closed.

Incident: {{incident_number}} — {{incident_title}}
Site: {{site_name}}
Closed by: {{closed_by_name}}

All corrective actions should have been verified before closure. Contact your HSE Officer if you have any questions.',
   '{"incident_number":"Incident reference","incident_title":"Incident title","site_name":"Site name","closed_by_name":"Name of person who closed the incident"}',
   true)

ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- =============================================================
-- NEW PERMISSIONS
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES

  -- Incident reporting
  ('incidents', 'create',    'Submit a new incident report'),
  ('incidents', 'read',      'View incident records'),
  ('incidents', 'update',    'Edit incident details'),
  ('incidents', 'delete',    'Delete incident records'),
  ('incidents', 'triage',    'Set incident severity and assign investigator'),
  ('incidents', 'approve',   'Approve investigation and close incidents'),
  ('incidents', 'export',    'Export incident register to CSV / PDF'),

  -- Investigation workspace
  ('investigations', 'create', 'Create and manage investigations'),
  ('investigations', 'read',   'View investigation records'),
  ('investigations', 'update', 'Edit investigation and RCA records'),

  -- CAPA
  ('capa', 'create', 'Create corrective and preventive actions'),
  ('capa', 'read',   'View CAPA records'),
  ('capa', 'update', 'Update CAPA status and notes'),
  ('capa', 'verify', 'Verify completed corrective actions'),

  -- Regulatory submissions
  ('regulatory', 'read',   'View regulatory submission records'),
  ('regulatory', 'submit', 'Create and submit regulatory reports')

ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS (Module 4 additions)
-- =============================================================

WITH perm AS (
  SELECT id, module, action FROM permissions
),
role_ids AS (
  SELECT id, name FROM roles WHERE is_system_role = true
),

-- ---- WORKER -------------------------------------------------
-- Can report incidents and view their own
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      ('incidents',     'create'),
      ('incidents',     'read'),
      ('capa',          'read'),
      ('capa',          'update')   -- can update own assigned CAPA
    )
),

-- ---- SUPERVISOR ---------------------------------------------
-- Triage incidents, manage investigations, assign CAPA
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('incidents',     'create'),
      ('incidents',     'read'),
      ('incidents',     'update'),
      ('incidents',     'triage'),
      ('investigations','create'),
      ('investigations','read'),
      ('investigations','update'),
      ('capa',          'create'),
      ('capa',          'read'),
      ('capa',          'update'),
      ('capa',          'verify')
    )
),

-- ---- HSE OFFICER -------------------------------------------
-- Full incident management including regulatory submissions
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('incidents',     'create'),
      ('incidents',     'read'),
      ('incidents',     'update'),
      ('incidents',     'delete'),
      ('incidents',     'triage'),
      ('incidents',     'approve'),
      ('incidents',     'export'),
      ('investigations','create'),
      ('investigations','read'),
      ('investigations','update'),
      ('capa',          'create'),
      ('capa',          'read'),
      ('capa',          'update'),
      ('capa',          'verify'),
      ('regulatory',    'read'),
      ('regulatory',    'submit')
    )
),

-- ---- EXECUTIVE ---------------------------------------------
-- Read-only + export
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('incidents',     'read'),
      ('incidents',     'export'),
      ('investigations','read'),
      ('capa',          'read'),
      ('regulatory',    'read')
    )
),

-- ---- SYSTEM ADMIN ------------------------------------------
-- All incident permissions
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
    AND p.module IN ('incidents','investigations','capa','regulatory')
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
