-- =============================================================
-- MODULE 5: Seed Data — Action Templates, Permissions, Role Mappings
-- =============================================================

-- =============================================================
-- NOTIFICATION TEMPLATES
-- Adds the 5 action-specific events not covered in earlier modules.
-- incidents.action_overdue was seeded in Module 4; we don't
-- duplicate it but add the new Module 5-specific events.
-- =============================================================

INSERT INTO notification_templates
  (organisation_id, trigger_event, name,
   subject_template, body_template, available_vars, is_active)
VALUES

  (NULL, 'actions.assigned',
   'Action Assigned',
   'Action assigned to you: {{action_number}} — {{action_title}}',
   'You have been assigned a corrective/preventive action.

Action No: {{action_number}}
Title: {{action_title}}
Source: {{source_reference}}
Priority: {{priority}}
Due Date: {{due_date}}

Please log in to review the action details and update your progress.',
   '{"action_number":"Action reference number","action_title":"Action title","source_reference":"Source incident/audit reference","priority":"Action priority level","due_date":"Action due date"}',
   true),

  (NULL, 'actions.verification_required',
   'Action Verification Required',
   'Action ready for your verification: {{action_number}}',
   'An action has been completed and submitted for your verification.

Action No: {{action_number}}
Title: {{action_title}}
Source: {{source_reference}}

Please log in to review the completion evidence and either verify and close, or reject and reopen the action.',
   '{"action_number":"Action reference number","action_title":"Action title","source_reference":"Source reference"}',
   true),

  (NULL, 'actions.rejected_and_reopened',
   'Action Verification Rejected',
   'Action rejected and reopened: {{action_number}}',
   'Your action has been reviewed and the verification has been rejected. It has been reopened for further work.

Action No: {{action_number}}
Title: {{action_title}}
Rejection reason: {{rejection_reason}}

Please log in to review the feedback and resubmit once the action has been properly completed.',
   '{"action_number":"Action reference number","action_title":"Action title","rejection_reason":"Reason for rejection"}',
   true),

  (NULL, 'actions.extension_requested',
   'Extension Request Submitted',
   'Extension requested for action {{action_number}}',
   '{{requester_name}} has requested an extension for the following action.

Action No: {{action_number}}
Title: {{action_title}}
Requested New Due Date: {{requested_date}}
Reason: {{reason}}

Please log in to approve or reject this extension request.',
   '{"action_number":"Action reference number","action_title":"Action title","requester_name":"Name of the person requesting","requested_date":"Requested new due date","reason":"Reason for extension"}',
   true),

  (NULL, 'actions.extension_approved',
   'Extension Request Approved',
   'Your extension has been approved: {{action_number}}',
   'Good news — your extension request has been approved.

Action No: {{action_number}}
Title: {{action_title}}
New Due Date: {{new_due_date}}

Please log in to continue working on this action.',
   '{"action_number":"Action reference number","action_title":"Action title","new_due_date":"Approved new due date"}',
   true),

  (NULL, 'actions.extension_rejected',
   'Extension Request Rejected',
   'Your extension has been rejected: {{action_number}}',
   'Your extension request has not been approved. The original due date remains in effect.

Action No: {{action_number}}
Title: {{action_title}}

Please log in to review the feedback and ensure the action is completed by the original due date.',
   '{"action_number":"Action reference number","action_title":"Action title"}',
   true)

ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- =============================================================
-- NEW PERMISSIONS
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES

  ('actions', 'create',     'Create standalone or linked corrective/preventive actions'),
  ('actions', 'read',       'View action records'),
  ('actions', 'update',     'Edit action details and status'),
  ('actions', 'delete',     'Delete or cancel actions'),
  ('actions', 'verify',     'Verify completed actions'),
  ('actions', 'reassign',   'Reassign actions to a different person'),
  ('actions', 'bulk_close', 'Bulk-close multiple actions at once'),
  ('actions', 'export',     'Export action register to CSV / PDF'),
  ('extensions', 'request', 'Request a due date extension for an assigned action'),
  ('extensions', 'review',  'Approve or reject extension requests')

ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS (Module 5 additions)
-- =============================================================

WITH perm AS (
  SELECT id, module, action FROM permissions
),
role_ids AS (
  SELECT id, name FROM roles WHERE is_system_role = true
),

-- ---- WORKER -------------------------------------------------
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      ('actions',    'create'),       -- can create standalone actions
      ('actions',    'read'),
      ('actions',    'update'),       -- can update own assigned actions
      ('extensions', 'request')       -- can request extensions on own actions
    )
),

-- ---- SUPERVISOR ---------------------------------------------
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('actions',    'create'),
      ('actions',    'read'),
      ('actions',    'update'),
      ('actions',    'verify'),
      ('actions',    'reassign'),
      ('actions',    'bulk_close'),
      ('actions',    'export'),
      ('extensions', 'request'),
      ('extensions', 'review')
    )
),

-- ---- HSE OFFICER -------------------------------------------
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('actions',    'create'),
      ('actions',    'read'),
      ('actions',    'update'),
      ('actions',    'delete'),
      ('actions',    'verify'),
      ('actions',    'reassign'),
      ('actions',    'bulk_close'),
      ('actions',    'export'),
      ('extensions', 'request'),
      ('extensions', 'review')
    )
),

-- ---- EXECUTIVE ---------------------------------------------
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('actions', 'read'),
      ('actions', 'export')
    )
),

-- ---- SYSTEM ADMIN ------------------------------------------
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
    AND p.module IN ('actions', 'extensions')
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
