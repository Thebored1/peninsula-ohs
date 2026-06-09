-- =============================================================
-- BACKGROUND CHECKS MODULE: Seed Data
-- =============================================================

-- ─── PROVIDERS ────────────────────────────────────────────────────────────────

INSERT INTO bgc_providers (code, name, description, website_url, supported_checks) VALUES
  (
    'certn',
    'Certn',
    'Canadian background check provider with API-first integration. Fastest turnaround in the Canadian market.',
    'https://certn.co',
    ARRAY[
      'identity', 'criminal_standard', 'criminal_vulnerable_sector',
      'drivers_abstract', 'employment_history', 'education_credential',
      'professional_licence', 'credit_check'
    ]::bgc_check_type[]
  ),
  (
    'triton',
    'Triton Canada',
    'Canadian background screening company, widely used across industries. Strong criminal record check capability.',
    'https://tritoncanada.ca',
    ARRAY[
      'identity', 'criminal_standard', 'criminal_vulnerable_sector',
      'employment_history', 'education_credential'
    ]::bgc_check_type[]
  ),
  (
    'rcmp',
    'RCMP e-Submission Portal',
    'RCMP direct submission for vulnerable sector checks. Required by law for certain roles. Processing time 2–8 weeks.',
    'https://www.rcmp-grc.gc.ca',
    ARRAY['criminal_vulnerable_sector']::bgc_check_type[]
  ),
  (
    'stub',
    'Development Stub',
    'Development and testing stub. Returns canned responses immediately. Never use in production.',
    NULL,
    ARRAY[
      'identity', 'criminal_standard', 'criminal_vulnerable_sector',
      'drivers_abstract', 'employment_history', 'education_credential',
      'professional_licence', 'reference_check', 'credit_check'
    ]::bgc_check_type[]
  )
ON CONFLICT (code) DO NOTHING;

-- ─── SYSTEM DEFAULT CONSENT TEMPLATE ──────────────────────────────────────────

INSERT INTO bgc_consent_templates
  (organisation_id, version, name, applies_to_checks, body_html, is_locked, is_active)
VALUES
  (
    NULL,
    1,
    'Standard Canadian Consent Form',
    ARRAY[
      'identity', 'criminal_standard', 'criminal_vulnerable_sector',
      'drivers_abstract', 'employment_history', 'education_credential',
      'professional_licence', 'credit_check'
    ]::bgc_check_type[],
    '<h2>Background Check Consent</h2>
<p>You are being asked to consent to a background check as part of the pre-employment process for <strong>{{organisation_name}}</strong> for the position of <strong>{{position_title}}</strong>.</p>

<h3>What will be checked</h3>
<p>The following checks have been requested for this role:</p>
<ul>{{check_type_list}}</ul>

<h3>Who will conduct the check</h3>
<p>This background check will be conducted by {{organisation_name}} using an accredited Canadian background check provider. Your personal information will be transmitted securely to the provider for the sole purpose of completing this check.</p>

<h3>How your information will be used</h3>
<p>Information collected will be used only to assess your suitability for the specific role described above. It will not be used for any other purpose without your separate consent.</p>

<h3>Your rights</h3>
<ul>
  <li>You have the right to access information collected about you.</li>
  <li>You have the right to dispute inaccurate or incomplete information.</li>
  <li>You may withdraw consent at any time before checks are completed. Withdrawal may affect the hiring process.</li>
  <li>If any background check result negatively affects a hiring decision, you will be notified and given an opportunity to dispute the result before a final decision is made.</li>
</ul>

<h3>Data retention</h3>
<p>Background check results are personal information subject to Canadian privacy law. Results will be retained for the period required by applicable law and then securely destroyed.</p>

<h3>Applicable law</h3>
<p>This consent is governed by the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation.</p>

<p>By signing below, you confirm that you have read and understood this consent form and that you voluntarily consent to the background checks described above.</p>',
    false,
    true
  )
ON CONFLICT DO NOTHING;

-- ─── SYSTEM DEFAULT REFERENCE QUESTIONNAIRE ───────────────────────────────────

INSERT INTO bgc_reference_templates (organisation_id, name, role_scope, is_active)
VALUES (NULL, 'Standard Professional Reference', 'General', true)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM bgc_reference_templates WHERE organisation_id IS NULL AND name = 'Standard Professional Reference' LIMIT 1)
INSERT INTO bgc_reference_questions (template_id, question_text, question_type, options, is_required, display_order)
SELECT
  tmpl.id,
  q.question_text,
  q.question_type::bgc_question_type,
  q.options::jsonb,
  q.is_required,
  q.display_order
FROM tmpl, (VALUES
  ('How long have you known the candidate, and in what capacity?',                                          'open_text',       NULL,                                        true,  1),
  ('What was the candidate''s position title and primary responsibilities?',                               'open_text',       NULL,                                        true,  2),
  ('How would you rate the candidate''s overall performance?',                                             'rating',          '{"min":1,"max":5,"labels":["Poor","Excellent"]}', true, 3),
  ('Please describe key strengths you observed in this candidate.',                                        'open_text',       NULL,                                        true,  4),
  ('Are there any areas where the candidate could improve?',                                               'open_text',       NULL,                                        false, 5),
  ('How did the candidate handle pressure, conflict, or difficult situations?',                            'open_text',       NULL,                                        false, 6),
  ('Would you re-hire this candidate?',                                                                    'yes_no',          NULL,                                        true,  7),
  ('If not, can you share why?',                                                                           'open_text',       NULL,                                        false, 8),
  ('Is there anything else about this candidate we should consider for a role in workplace safety/OHS?',   'open_text',       NULL,                                        false, 9),
  ('Can you confirm that you worked directly with this person and are providing this reference voluntarily?', 'yes_no',        NULL,                                        true,  10)
) AS q(question_text, question_type, options, is_required, display_order)
ON CONFLICT DO NOTHING;

-- ─── NOTIFICATION TEMPLATES ───────────────────────────────────────────────────

INSERT INTO notification_templates
  (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active)
VALUES
  (
    NULL,
    'bgc.consent_requested',
    'BGC Consent Requested',
    'Background check consent requested: {{candidate_name}}',
    'A background check consent request has been sent to {{candidate_name}} for the {{position_title}} position. Package: {{package_number}}.',
    '["candidate_name","position_title","package_number"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.consent_given',
    'BGC Consent Received',
    'Background check consent received: {{candidate_name}}',
    '{{candidate_name}} has provided consent for their background check ({{position_title}}). Package {{package_number}} is ready to proceed to check ordering.',
    '["candidate_name","position_title","package_number"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.result_received',
    'Background Check Result Received',
    'Background check result received: {{candidate_name}}',
    'A {{check_type}} background check result has been received for {{candidate_name}}. Result: {{result_summary}}. Package {{package_number}} requires review.',
    '["candidate_name","check_type","result_summary","package_number"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.adverse_action_required',
    'Adverse Action Required',
    'URGENT: Adverse action notice required — {{candidate_name}}',
    'An adverse action {{notice_type}}-notification is required for {{candidate_name}} (Package {{package_number}}). The dispute window closes {{dispute_window_closes_at}}. Please review immediately.',
    '["candidate_name","notice_type","package_number","dispute_window_closes_at"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.check_error',
    'Background Check Error',
    'Background check submission error: {{candidate_name}}',
    'A background check order for {{candidate_name}} ({{check_type}}, Package {{package_number}}) encountered an error: {{error_detail}}. Please review and resubmit.',
    '["candidate_name","check_type","package_number","error_detail"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.licence_expiry_90day',
    'Licence Expiring in 90 Days',
    'Licence expiring soon: {{worker_name}} — {{licence_type}}',
    '{{worker_name}}''s {{licence_type}} ({{licence_number}}) expires on {{expiry_date}} — in 90 days. Please arrange renewal to maintain compliance.',
    '["worker_name","licence_type","licence_number","expiry_date"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.licence_expiry_60day',
    'Licence Expiring in 60 Days',
    'Licence expiring in 60 days: {{worker_name}} — {{licence_type}}',
    '{{worker_name}}''s {{licence_type}} ({{licence_number}}) expires on {{expiry_date}} — in 60 days. Renewal is overdue — please act now.',
    '["worker_name","licence_type","licence_number","expiry_date"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.licence_expiry_30day',
    'Licence Expiring in 30 Days — Urgent',
    'URGENT: Licence expiring in 30 days: {{worker_name}} — {{licence_type}}',
    '{{worker_name}}''s {{licence_type}} ({{licence_number}}) expires on {{expiry_date}} — in 30 days. If not renewed, this worker will be flagged as non-compliant for roles requiring this licence.',
    '["worker_name","licence_type","licence_number","expiry_date"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.licence_expired',
    'Licence Expired',
    'Licence expired: {{worker_name}} — {{licence_type}}',
    '{{worker_name}}''s {{licence_type}} ({{licence_number}}) expired on {{expiry_date}}. This worker is now non-compliant for roles requiring this licence and must not be assigned to such duties.',
    '["worker_name","licence_type","licence_number","expiry_date"]'::jsonb,
    true
  ),
  (
    NULL,
    'bgc.reverification_due',
    'Re-Verification Due',
    'Background re-verification due: {{worker_name}}',
    'A {{check_type}} re-verification is due for {{worker_name}} on {{due_date}}. Please initiate a new consent and check order.',
    '["worker_name","check_type","due_date"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- ─── WEBHOOK EVENT TYPES ──────────────────────────────────────────────────────

INSERT INTO webhook_event_types (code, name, module, description)
VALUES
  ('background_check.consent_given',   'BGC Consent Given',        'background_checks', 'Candidate has provided consent for their background check'),
  ('background_check.result_received', 'BGC Result Received',      'background_checks', 'A background check result has been received from a provider'),
  ('background_check.complete',        'BGC Package Complete',      'background_checks', 'All checks in a package have been completed and adjudicated'),
  ('background_check.adverse_action',  'BGC Adverse Action',        'background_checks', 'An adverse action notice has been issued'),
  ('worker_licence.expiring',          'Worker Licence Expiring',   'background_checks', 'A worker licence is approaching its expiry date'),
  ('worker_licence.expired',           'Worker Licence Expired',    'background_checks', 'A worker licence has expired')
ON CONFLICT (code) DO NOTHING;

-- ─── ROLE: Background Check Reviewer ─────────────────────────────────────────

INSERT INTO roles (organisation_id, name, description, is_system_role)
VALUES
  (NULL, 'Background Check Reviewer',
   'Can view background check results and adjudicate packages. Cannot manage provider credentials.',
   true)
ON CONFLICT (organisation_id, name) DO NOTHING;

-- ─── PERMISSIONS ──────────────────────────────────────────────────────────────

INSERT INTO permissions (module, action, description) VALUES
  ('background_checks', 'create',    'Initiate a new background check package'),
  ('background_checks', 'read',      'View background check packages and orders'),
  ('background_checks', 'update',    'Update background check packages and submit orders'),
  ('background_checks', 'review',    'View check results and record adjudication decisions'),
  ('background_checks', 'configure', 'Configure provider credentials and role requirements'),
  ('worker_licences',   'create',    'Add worker licences and certifications'),
  ('worker_licences',   'read',      'View worker licence records'),
  ('worker_licences',   'update',    'Update worker licence details and status')
ON CONFLICT (module, action) DO NOTHING;

-- Wire permissions to roles

-- Background Check Reviewer: review + read
WITH rev_role AS (SELECT id FROM roles WHERE name = 'Background Check Reviewer' AND organisation_id IS NULL),
     rev_perms AS (
       SELECT id FROM permissions
       WHERE (module, action) IN (
         ('background_checks', 'read'),
         ('background_checks', 'review'),
         ('worker_licences',   'read')
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rev_role r, rev_perms p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Supervisor: create + read + update + worker licence create/read
WITH supervisor_role AS (SELECT id FROM roles WHERE name = 'Supervisor' AND organisation_id IS NULL),
     supervisor_perms AS (
       SELECT id FROM permissions
       WHERE (module, action) IN (
         ('background_checks', 'create'),
         ('background_checks', 'read'),
         ('background_checks', 'update'),
         ('worker_licences',   'create'),
         ('worker_licences',   'read'),
         ('worker_licences',   'update')
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM supervisor_role r, supervisor_perms p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HSE Officer: all BGC permissions
WITH hse_role AS (SELECT id FROM roles WHERE name = 'HSE Officer' AND organisation_id IS NULL),
     hse_perms AS (SELECT id FROM permissions WHERE module IN ('background_checks', 'worker_licences'))
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hse_role r, hse_perms p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- System Admin: all BGC permissions
WITH admin_role AS (SELECT id FROM roles WHERE name = 'System Admin' AND organisation_id IS NULL),
     admin_perms AS (SELECT id FROM permissions WHERE module IN ('background_checks', 'worker_licences'))
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_role r, admin_perms p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Executive: read only
WITH exec_role AS (SELECT id FROM roles WHERE name = 'Executive' AND organisation_id IS NULL),
     exec_perms AS (
       SELECT id FROM permissions
       WHERE (module, action) IN (
         ('background_checks', 'read'),
         ('worker_licences',   'read')
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM exec_role r, exec_perms p
ON CONFLICT (role_id, permission_id) DO NOTHING;
