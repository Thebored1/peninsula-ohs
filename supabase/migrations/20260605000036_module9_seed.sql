-- =============================================================
-- MODULE 9: Seed Data — Audit Management
-- =============================================================

INSERT INTO audit_types (code, name, description, icon, display_order) VALUES
  ('internal_safety',      'Internal Safety Audit',         'Conducted by internal staff against site safety requirements.', 'clipboard', 1),
  ('external_third_party', 'External / Third-Party Audit',  'Conducted by an independent external auditor or certification body.', 'users', 2),
  ('compliance',           'Compliance Audit',              'Assessment against a specific regulation, code, or standard.', 'file-check', 3),
  ('contractor',           'Contractor Audit',              'Audit of contractor compliance with site safety rules and obligations.', 'hard-hat', 4),
  ('management_review',    'Management System Review',      'Formal management review of the OHS management system (e.g. ISO 45001 clause 9.3).', 'bar-chart', 5),
  ('pre_task',             'Pre-Task / Job Safety',         'Brief structured review before commencing a specific task.', 'check-square', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO audit_finding_outcomes (code, name, description, requires_action, is_nonconformance, colour_code, display_order) VALUES
  ('conformance',              'Conformance',                'Requirement is being met. No action needed.', false, false, '#22c55e', 1),
  ('minor_nc',                 'Minor Non-Conformance',      'Partial fulfilment of requirement or isolated failure. Action required.', true, true, '#eab308', 2),
  ('major_nc',                 'Major Non-Conformance',      'Systematic failure or complete absence of a requirement. Urgent action required.', true, true, '#ef4444', 3),
  ('observation',              'Observation',                'A noted item that does not constitute a non-conformance but is worth monitoring.', false, false, '#3b82f6', 4),
  ('opportunity_for_improvement','Opportunity for Improvement','System or practice is adequate but could be improved. Action optional.', false, false, '#8b5cf6', 5),
  ('not_applicable',           'Not Applicable',             'The criterion does not apply in this context.', false, false, '#6b7280', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'audits.in_progress',  'Audit Started',
   'Audit commenced: {{audit_number}} — {{audit_title}}',
   'The following audit has commenced.

Audit: {{audit_number}} — {{audit_title}}
Lead Auditor: {{auditor_name}}

Log in to track progress.',
   '{"audit_number":"Audit reference","audit_title":"Audit title","auditor_name":"Lead auditor name"}', true),

  (NULL, 'audits.completed',    'Audit Completed',
   'Audit completed: {{audit_number}}',
   'The following audit has been completed.

Audit: {{audit_number}} — {{audit_title}}
Major NCs: {{major_nc_count}}
Minor NCs: {{minor_nc_count}}

Log in to review findings and assign corrective actions.',
   '{"audit_number":"Audit reference","audit_title":"Audit title","major_nc_count":"Major non-conformances","minor_nc_count":"Minor non-conformances"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('audit_templates', 'read',   'View audit template library'),
  ('audit_templates', 'manage', 'Create and edit audit templates'),
  ('audits', 'create',  'Create and schedule audits'),
  ('audits', 'read',    'View audit records and findings'),
  ('audits', 'update',  'Edit audit records and record findings'),
  ('audits', 'approve', 'Approve audit reports'),
  ('audits', 'export',  'Export audit reports')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('audit_templates','read'),('audits','read'),('audits','export')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND (p.module, p.action) IN (
    ('audit_templates','read'),('audit_templates','manage'),
    ('audits','create'),('audits','read'),('audits','update'),('audits','approve'),('audits','export')
  )
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('audits','read'),('audits','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module IN ('audit_templates','audits')
),
all_m AS (
  SELECT * FROM supervisor_perms UNION ALL SELECT * FROM hse_perms
  UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
