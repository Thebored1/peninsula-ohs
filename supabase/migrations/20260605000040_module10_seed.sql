-- =============================================================
-- MODULE 10: Seed Data — Document Management
-- =============================================================

INSERT INTO document_types (code, name, description, requires_review, review_cycle_days, icon, display_order) VALUES
  ('safety_policy',     'Safety Policy',              'Organisation-wide OHS policy statements.', true, 365, 'file-text', 1),
  ('sop',               'Standard Operating Procedure','Step-by-step work instructions.', true, 365, 'list', 2),
  ('swms',              'Safe Work Method Statement',  'SWMS for high-risk construction work.', true, 365, 'clipboard', 3),
  ('emergency_plan',    'Emergency Response Plan',     'Site emergency procedures and contacts.', true, 365, 'alert-triangle', 4),
  ('sds',               'Safety Data Sheet (SDS)',     'Chemical hazard and safe handling information.', false, 730, 'flask', 5),
  ('certificate',       'Certificate / Licence',       'Compliance certificates and competency licences.', false, 365, 'award', 6),
  ('risk_assessment',   'Risk Assessment (Document)',  'Documented risk assessment in form/report format.', true, 180, 'shield', 7),
  ('form_template',     'Form / Template',             'Blank forms and templates for operational use.', false, 730, 'layout', 8),
  ('training_material', 'Training Material',           'Induction and training content.', true, 365, 'book', 9),
  ('contractor_doc',    'Contractor Document',         'Contractor-submitted SWMS, insurances, and licences.', false, 365, 'users', 10),
  ('permit_procedure',  'Permit Procedure',            'Procedures referenced in Permits to Work.', true, 365, 'key', 11)
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_statuses (code, name, description, is_editable, is_live, colour_code, display_order) VALUES
  ('draft',         'Draft',           'Being authored. Not visible to general workers.', true,  false, '#6b7280', 1),
  ('in_review',     'Under Review',    'Submitted for review/approval. Not yet live.', false, false, '#eab308', 2),
  ('approved',      'Approved',        'Approved but not yet published to workers.', false, false, '#3b82f6', 3),
  ('published',     'Published',       'Live — accessible to all authorised workers.', false, true,  '#22c55e', 4),
  ('rejected',      'Rejected',        'Review rejected. Author must revise and resubmit.', true, false, '#ef4444', 5),
  ('archived',      'Archived',        'Superseded by a newer version. Read-only.', false, false, '#6b7280', 6),
  ('expired',       'Expired',         'Past its expiry date. Must be reviewed/reissued.', false, false, '#f97316', 7),
  ('superseded',    'Superseded',      'Replaced by a newer document.', false, false, '#6b7280', 8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'documents.review_requested',   'Document Review Required',
   'Your review is required: {{document_title}}',
   'A document has been submitted and requires your review.

Document: {{document_title}}
Step: {{step_name}}

Log in to review the document and record your decision.',
   '{"document_title":"Document title","step_name":"Workflow step name"}', true),

  (NULL, 'documents.review_rejected',    'Document Review Rejected',
   'Document rejected: {{document_title}}',
   'Your document has been reviewed and rejected.

Document: {{document_title}}
Reason: {{rejection_notes}}

Please log in to revise the document and resubmit for review.',
   '{"document_title":"Document title","rejection_notes":"Reason for rejection"}', true),

  (NULL, 'documents.acknowledgement_required', 'Document Acknowledgement Required',
   'Please read and acknowledge: {{document_title}}',
   'A new version of an important document has been published and requires your acknowledgement.

Document: {{document_title}}

Please log in, read the document carefully, and record your acknowledgement.',
   '{"document_title":"Document title"}', true),

  (NULL, 'documents.expiring_soon',      'Document Expiring Soon',
   'Document expiring: {{document_title}}',
   'The following document is approaching its expiry date and requires review.

Document: {{document_title}}
Expiry Date: {{expiry_date}}

Please log in to review and reissue the document before it expires.',
   '{"document_title":"Document title","expiry_date":"Expiry date"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('documents', 'publish',        'Publish approved document versions'),
  ('documents', 'review',         'Review documents in an approval workflow'),
  ('documents', 'acknowledge',    'Acknowledge documents'),
  ('documents', 'manage_workflow','Create and manage document review workflows'),
  ('documents', 'export',         'Export document registers and acknowledgement reports')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (
    ('documents','read'),('documents','acknowledge')
  )
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('documents','read'),('documents','acknowledge'),('documents','review'),('documents','export')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND (p.module, p.action) IN (
    ('documents','read'),('documents','create'),('documents','update'),('documents','delete'),
    ('documents','publish'),('documents','review'),('documents','acknowledge'),
    ('documents','manage_workflow'),('documents','export')
  )
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('documents','read'),('documents','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module = 'documents'
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
