-- =============================================================
-- INTEGRATIONS: Seed Data
-- =============================================================

INSERT INTO integration_types (code, name, description, category, icon, display_order) VALUES
  ('hris_generic',   'HRIS (Generic REST)',     'Generic HR system integration via REST API (Workday, BambooHR, etc.).', 'data_sync', 'users',      1),
  ('hris_workday',   'Workday',                 'Native Workday HCM integration for employee sync.', 'data_sync', 'briefcase', 2),
  ('hris_bamboohr',  'BambooHR',                'BambooHR employee data sync.', 'data_sync', 'leaf',        3),
  ('hris_sap',       'SAP SuccessFactors',      'SAP SuccessFactors HR data sync.', 'data_sync', 'database',   4),
  ('sso_saml',       'SSO / SAML 2.0',          'Enterprise single sign-on via SAML 2.0 (Okta, Azure AD, ADFS).', 'auth', 'lock',       5),
  ('sso_oidc',       'SSO / OIDC',              'OpenID Connect SSO (Google Workspace, Azure AD, Okta).', 'auth', 'lock',       6),
  ('erp_generic',    'ERP (Generic)',            'Generic ERP integration for asset and contractor data.', 'data_sync', 'settings',   7),
  ('powerbi',        'Power BI',                'Microsoft Power BI data export for custom dashboards.', 'analytics', 'bar-chart',  8),
  ('tableau',        'Tableau',                 'Tableau data export and live connection.', 'analytics', 'bar-chart',  9),
  ('email_smtp',     'Email (SMTP)',             'Custom SMTP email gateway for notification delivery.', 'messaging', 'mail',       10),
  ('sms_twilio',     'SMS (Twilio)',             'Twilio SMS gateway for critical alert delivery.', 'messaging', 'message-circle', 11),
  ('sms_generic',    'SMS (Generic)',            'Generic SMS gateway integration.', 'messaging', 'message-circle', 12)
ON CONFLICT (code) DO NOTHING;

-- Webhook event types — mirror all notification event codes
INSERT INTO webhook_event_types (code, name, description, module, display_order) VALUES
  -- Incidents
  ('incident.created',           'Incident Created',            'A new incident has been submitted.',       'incidents',   10),
  ('incident.status_changed',    'Incident Status Changed',     'An incident status has been updated.',     'incidents',   11),
  ('incident.closed',            'Incident Closed',             'An incident has been closed.',             'incidents',   12),
  ('incident.investigation_assigned', 'Investigation Assigned', 'An investigation has been assigned.',     'incidents',   13),
  -- Actions / CAPA
  ('action.created',             'Action Created',              'A new CAPA action has been raised.',       'actions',     20),
  ('action.overdue',             'Action Overdue',              'A CAPA action has passed its due date.',   'actions',     21),
  ('action.completed',           'Action Completed',            'An action has been marked completed.',     'actions',     22),
  ('action.verified',            'Action Verified',             'A completed action has been verified.',    'actions',     23),
  ('action.extension_requested', 'Extension Requested',        'An extension has been requested.',         'actions',     24),
  -- Inspections
  ('inspection.submitted',       'Inspection Submitted',        'An inspection has been submitted.',        'inspections', 30),
  ('inspection.score_below_threshold', 'Inspection Failed Threshold', 'Inspection score below threshold.',  'inspections', 31),
  ('inspection.overdue',         'Inspection Overdue',          'A scheduled inspection is overdue.',       'inspections', 32),
  -- Permits
  ('permit.submitted',           'Permit Submitted',            'A permit to work has been submitted.',     'permits',     40),
  ('permit.approved',            'Permit Approved',             'A permit to work has been approved.',      'permits',     41),
  ('permit.rejected',            'Permit Rejected',             'A permit to work has been rejected.',      'permits',     42),
  ('permit.expired',             'Permit Expired',              'An active permit to work has expired.',    'permits',     43),
  -- Risks / Hazards
  ('hazard.created',             'Hazard Report Created',       'A hazard report has been submitted.',      'risks',       50),
  ('hazard.promoted',            'Hazard Promoted to Risk',     'A hazard has been elevated to a risk.',    'risks',       51),
  ('risk.created',               'Risk Created',                'A new risk register entry has been added.','risks',       52),
  ('risk.high_score',            'High Risk Identified',        'A high or critical risk has been recorded.','risks',      53),
  -- Audits
  ('audit.completed',            'Audit Completed',             'An audit has been completed.',             'audits',      60),
  -- Documents
  ('document.published',         'Document Published',          'A document version has been published.',   'documents',   70),
  ('document.acknowledgement_required', 'Acknowledgement Required', 'A document requires acknowledgement.','documents',   71),
  ('document.expiring_soon',     'Document Expiring',           'A document is approaching expiry.',        'documents',   72),
  -- Assets
  ('asset.out_of_service',       'Asset Out of Service',        'An asset has been flagged out of service.','assets',      80),
  ('asset.inspection_overdue',   'Asset Inspection Overdue',    'An asset inspection is overdue.',          'assets',      81),
  -- Chemicals
  ('chemical.sds_review_due',    'SDS Review Due',              'A Safety Data Sheet is due for review.',   'chemicals',   90),
  ('chemical.low_stock',         'Chemical Low Stock',          'Chemical stock below 20% of maximum.',     'chemicals',   91),
  -- Environment
  ('environment.limit_exceeded', 'Environmental Limit Exceeded','A monitoring reading exceeded the limit.', 'environment', 100),
  ('environment.report_due',     'Environmental Report Due',    'An environmental report is due.',          'environment', 101),
  -- Health
  ('health.check_due',           'Health Check Due',            'A health surveillance check is due.',      'health',      110),
  ('health.check_result_action', 'Health Check — Action Required', 'A health check needs follow-up.',      'health',      111),
  -- Users
  ('user.created',               'User Created',                'A new user has been added.',               'users',       120),
  ('user.deactivated',           'User Deactivated',            'A user account has been deactivated.',     'users',       121)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('integrations', 'manage',        'Configure and manage integrations'),
  ('integrations', 'read',          'View integration status and logs'),
  ('api_keys',     'create',        'Generate API keys'),
  ('api_keys',     'read',          'View API keys'),
  ('api_keys',     'revoke',        'Revoke API keys'),
  ('webhooks',     'manage',        'Create and manage webhook endpoints'),
  ('webhooks',     'read',          'View webhook endpoints and delivery logs')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND (p.module, p.action) IN (
    ('integrations','read'),
    ('api_keys','create'),('api_keys','read'),('api_keys','revoke'),
    ('webhooks','manage'),('webhooks','read')
  )
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module IN ('integrations','api_keys','webhooks')
),
all_m AS (SELECT * FROM hse_perms UNION ALL SELECT * FROM admin_perms)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
