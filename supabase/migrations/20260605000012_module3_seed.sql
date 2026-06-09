-- =============================================================
-- MODULE 3: Seed Data — System Notification Templates & Permissions
-- =============================================================
-- System templates (organisation_id IS NULL) are the platform
-- defaults. Every org inherits them automatically and can override
-- them with their own org-scoped templates.
-- All inserts are idempotent via ON CONFLICT DO NOTHING.
-- =============================================================

-- =============================================================
-- SYSTEM NOTIFICATION TEMPLATES
-- Variables common across templates:
--   {{organisation_name}}, {{site_name}}, {{department_name}},
--   {{reporter_name}}, {{assignee_name}}, {{due_date}}
-- =============================================================

INSERT INTO notification_templates
  (organisation_id, trigger_event, name,
   subject_template, body_template, available_vars, is_active)
VALUES

  -- ── User Management ─────────────────────────────────────────
  (NULL, 'users.invited',
   'User Invitation',
   'You have been invited to {{organisation_name}}',
   'Hi {{first_name}},

You have been invited to join {{organisation_name}} on the EXXIO platform.

Your account has been created. Please follow the link in your welcome email to set your password and complete setup.

If you have any questions, contact your system administrator.',
   '{"organisation_name":"Name of the organisation","first_name":"Recipient first name"}',
   true),

  (NULL, 'users.role_assigned',
   'Role Assigned',
   'New role assigned: {{role_name}}',
   'Hi {{first_name}},

You have been assigned the role of {{role_name}} within {{organisation_name}}.

This change is effective immediately. Contact your administrator if you believe this is an error.',
   '{"first_name":"Recipient first name","role_name":"Name of the assigned role","organisation_name":"Organisation name"}',
   true),

  (NULL, 'users.role_revoked',
   'Role Revoked',
   'Role removed: {{role_name}}',
   'Hi {{first_name}},

Your {{role_name}} role in {{organisation_name}} has been removed.

Contact your system administrator if you have any questions.',
   '{"first_name":"Recipient first name","role_name":"Name of the removed role","organisation_name":"Organisation name"}',
   true),

  -- ── Document Management ─────────────────────────────────────
  (NULL, 'documents.uploaded',
   'New Document Uploaded',
   'New document uploaded: {{document_name}}',
   'A new document has been added to the {{organisation_name}} document register.

Document: {{document_name}}
Category: {{category}}
Site: {{site_name}}
Uploaded by: {{uploader_name}}

Log in to view and download the document.',
   '{"document_name":"Document title","category":"Document category","site_name":"Associated site","uploader_name":"Name of the person who uploaded"}',
   true),

  -- ── Incident Management (stub — Module 4) ───────────────────
  (NULL, 'incidents.submitted',
   'Incident Reported',
   'New {{incident_type}} reported at {{site_name}}',
   'A new incident has been reported and requires your attention.

Type: {{incident_type}}
Site: {{site_name}}
Location: {{work_area_name}}
Reported by: {{reporter_name}}
Date/Time: {{incident_date}}

Log in to review the incident and assign corrective actions.',
   '{"incident_type":"Type of incident","site_name":"Site where incident occurred","work_area_name":"Specific work area","reporter_name":"Person who reported","incident_date":"Date and time of incident"}',
   true),

  (NULL, 'incidents.action_overdue',
   'Corrective Action Overdue',
   'Overdue action: {{action_title}}',
   'A corrective action assigned to you is now overdue.

Action: {{action_title}}
Incident: {{incident_reference}}
Due Date: {{due_date}}
Assigned by: {{assigner_name}}

Please log in to update the status or request an extension.',
   '{"action_title":"Title of the corrective action","incident_reference":"Incident reference number","due_date":"Action due date","assigner_name":"Person who assigned the action"}',
   true),

  -- ── Permit to Work (stub — future module) ───────────────────
  (NULL, 'permits.approval_required',
   'Permit Approval Required',
   'Work permit requires your approval: {{permit_number}}',
   'A work permit has been submitted and requires your approval.

Permit No: {{permit_number}}
Work Type: {{work_type}}
Site: {{site_name}}
Location: {{work_area_name}}
Requested by: {{requester_name}}
Planned Start: {{start_date}}

Please log in to review and approve or reject the permit.',
   '{"permit_number":"Permit reference number","work_type":"Type of work","site_name":"Site name","work_area_name":"Work area","requester_name":"Person requesting the permit","start_date":"Planned start date"}',
   true),

  -- ── Training & Competency (stub — future module) ─────────────
  (NULL, 'training.overdue',
   'Training Overdue',
   'Overdue training: {{training_name}}',
   'The following training assigned to you is now overdue.

Training: {{training_name}}
Due Date: {{due_date}}
Assigned by: {{assigner_name}}

Please contact your supervisor to schedule this training as soon as possible.',
   '{"training_name":"Name of the training course","due_date":"Date training was due","assigner_name":"Person who assigned the training"}',
   true),

  -- ── Inspections (stub — future module) ───────────────────────
  (NULL, 'inspections.scheduled',
   'Inspection Scheduled',
   'You have an inspection scheduled: {{inspection_name}}',
   'An inspection has been scheduled and assigned to you.

Inspection: {{inspection_name}}
Site: {{site_name}}
Location: {{work_area_name}}
Scheduled Date: {{scheduled_date}}
Assigned by: {{assigner_name}}

Log in to view the inspection checklist and begin preparation.',
   '{"inspection_name":"Name of the inspection","site_name":"Site name","work_area_name":"Work area","scheduled_date":"Scheduled inspection date","assigner_name":"Person who scheduled the inspection"}',
   true),

  -- ── Escalation ───────────────────────────────────────────────
  (NULL, 'notifications.escalation',
   'Escalation Notice',
   '[ESCALATION] {{original_title}} — no response after {{elapsed_time}}',
   'This is an escalation notice. The following item has not been acknowledged within the required timeframe.

Original notification: {{original_title}}
Elapsed time: {{elapsed_time}}
Escalation step: {{escalation_step}}

Immediate action is required. Please log in to review and acknowledge.',
   '{"original_title":"Title of the original notification","elapsed_time":"Time elapsed since original notification","escalation_step":"Current escalation level"}',
   true),

  -- ── Daily Digest ─────────────────────────────────────────────
  (NULL, 'digest.daily',
   'Daily OHS Summary',
   'Your daily OHS summary — {{date}}',
   'Good morning {{first_name}},

Here is your daily OHS summary for {{organisation_name}} on {{date}}.

{{digest_body}}

Log in to the EXXIO platform to view full details and take action on any outstanding items.',
   '{"first_name":"Recipient first name","organisation_name":"Organisation name","date":"Summary date","digest_body":"Auto-generated summary content"}',
   true)

ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- =============================================================
-- NEW PERMISSIONS
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES

  -- Notification rules & templates (admin config)
  ('notifications', 'read',   'View in-app notifications'),
  ('notifications', 'manage', 'Create and manage notification rules'),
  ('notifications', 'export', 'Export notification history log'),

  -- Templates
  ('templates', 'read',   'View notification templates'),
  ('templates', 'manage', 'Create and edit notification templates'),

  -- Escalation chains
  ('escalations', 'read',   'View escalation chains and active escalations'),
  ('escalations', 'manage', 'Create and edit escalation chains')

ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS (Module 3 additions)
-- =============================================================

WITH perm AS (
  SELECT id, module, action FROM permissions
),
role_ids AS (
  SELECT id, name FROM roles WHERE is_system_role = true
),

-- ---- WORKER -------------------------------------------------
-- Can read their own notifications only (RLS enforces scoping)
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      ('notifications', 'read')
    )
),

-- ---- SUPERVISOR ---------------------------------------------
-- Read notifications; can view rules (to understand what fires)
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('notifications', 'read'),
      ('templates',     'read'),
      ('escalations',   'read')
    )
),

-- ---- HSE OFFICER -------------------------------------------
-- Full notification management except system-template creation
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('notifications', 'read'),
      ('notifications', 'manage'),
      ('notifications', 'export'),
      ('templates',     'read'),
      ('templates',     'manage'),
      ('escalations',   'read'),
      ('escalations',   'manage')
    )
),

-- ---- EXECUTIVE ----------------------------------------------
-- Read-only view of notifications
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('notifications', 'read'),
      ('notifications', 'export'),
      ('templates',     'read'),
      ('escalations',   'read')
    )
),

-- ---- SYSTEM ADMIN ------------------------------------------
-- All permissions
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
    AND (p.module, p.action) IN (
      ('notifications', 'read'),
      ('notifications', 'manage'),
      ('notifications', 'export'),
      ('templates',     'read'),
      ('templates',     'manage'),
      ('escalations',   'read'),
      ('escalations',   'manage')
    )
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
