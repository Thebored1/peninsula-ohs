-- =============================================================
-- MODULE 11: Seed Data — Permit to Work
-- =============================================================

INSERT INTO permit_types (code, name, description, rescue_plan_required, isolation_required, max_duration_hours, icon, display_order) VALUES
  ('hot_work',           'Hot Work',                  'Welding, grinding, cutting, or any work generating heat or sparks.', false, false, 8,  'flame',      1),
  ('confined_space',     'Confined Space Entry',      'Entry into tanks, vessels, pits, or other confined spaces.',         true,  true,  8,  'circle',     2),
  ('working_at_heights', 'Working at Heights',        'Work on scaffolding, ladders, elevated platforms, or rooftops.',    false, false, 12, 'arrow-up',   3),
  ('electrical',         'Electrical Isolation',      'Work on or near live electrical systems requiring isolation.',       false, true,  8,  'zap',        4),
  ('excavation',         'Excavation / Trenching',    'Digging, trenching, or any ground disturbance activities.',         false, false, 10, 'shovel',     5),
  ('chemical_handling',  'Chemical Handling',         'Work involving hazardous chemicals, gases, or toxic substances.',    false, false, 8,  'flask',      6),
  ('general_high_risk',  'General High-Risk Work',    'High-risk work not covered by other permit types.',                 false, false, 12, 'alert-triangle', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permit_statuses (code, name, description, is_active_work, is_terminal, colour_code, display_order) VALUES
  ('draft',           'Draft',            'Being prepared by applicant.',                      false, false, '#6b7280', 1),
  ('submitted',       'Submitted',        'Awaiting supervisor/HSE review.',                   false, false, '#eab308', 2),
  ('under_review',    'Under Review',     'Being reviewed by approvers.',                      false, false, '#f97316', 3),
  ('approved',        'Approved',         'All approvals received. Ready to issue.',            false, false, '#3b82f6', 4),
  ('issued',          'Issued',           'Permit issued to worker. Work may commence.',        false, false, '#8b5cf6', 5),
  ('active',          'Active',           'Work is in progress under this permit.',             true,  false, '#22c55e', 6),
  ('work_completed',  'Work Completed',   'Worker has signed off. Site clearance pending.',    false, false, '#eab308', 7),
  ('site_cleared',    'Site Cleared',     'Supervisor confirmed site is clear and safe.',       false, false, '#3b82f6', 8),
  ('closed',          'Closed',           'Permit fully closed. All actions complete.',         false, true,  '#6b7280', 9),
  ('rejected',        'Rejected',         'Permit application rejected.',                       false, true,  '#ef4444', 10),
  ('cancelled',       'Cancelled',        'Cancelled before commencement.',                     false, true,  '#6b7280', 11),
  ('expired',         'Expired',          'Time limit reached while permit was active.',        false, true,  '#ef4444', 12)
ON CONFLICT (code) DO NOTHING;

INSERT INTO ppe_types (code, name, description, icon, display_order) VALUES
  ('hard_hat',          'Hard Hat / Safety Helmet',      'Protects head from falling objects and impact.', 'hard-hat',    1),
  ('safety_glasses',    'Safety Glasses / Goggles',      'Protects eyes from particles, splashes, and UV.', 'eye',        2),
  ('face_shield',       'Face Shield',                   'Full-face protection for chemical splashes or grinding.', 'shield', 3),
  ('hearing_protection','Hearing Protection',             'Earplugs or earmuffs for noise environments.', 'headphones',   4),
  ('p1_respirator',     'P1 Respirator',                  'Filters particles — dusts, pollens, sea-sprays.', 'wind',       5),
  ('p2_respirator',     'P2 Respirator',                  'Filters fine particles, biological aerosols.', 'wind',         6),
  ('supplied_air',      'Supplied Air / SCBA',            'Self-contained breathing apparatus for IDLH atmospheres.', 'wind', 7),
  ('hi_vis_vest',       'High-Visibility Vest',           'Makes worker visible in traffic and low-light areas.', 'eye',    8),
  ('safety_gloves',     'Safety Gloves',                  'Hand protection — cut, chemical, heat, or impact rated.', 'hand', 9),
  ('safety_boots',      'Safety Boots / Steel-Capped',    'Foot protection from crush, puncture, and chemical hazards.', 'boot', 10),
  ('fall_harness',      'Fall Protection Harness',        'Full-body harness with lanyard for working at heights.', 'anchor', 11),
  ('chemical_suit',     'Chemical Protection Suit',       'Full-body barrier against chemical splash or gas.', 'shield',   12),
  ('welding_helmet',    'Welding Helmet / Shield',        'Protects face and eyes during welding and hot work.', 'zap',     13),
  ('anti_static',       'Anti-Static / ESD Protection',  'Prevents electrostatic discharge in sensitive areas.', 'zap',    14)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_templates (organisation_id, trigger_event, name, subject_template, body_template, available_vars, is_active) VALUES
  (NULL, 'permits.approval_required', 'Permit Approval Required',
   'Permit to Work approval required: {{permit_number}}',
   'A Permit to Work has been submitted and requires your review and approval.

Permit No: {{permit_number}}
Type: {{permit_type}}
Title: {{permit_title}}
Site: {{site_name}}

Please log in to review the permit details and record your decision.',
   '{"permit_number":"PTW reference","permit_type":"Permit type","permit_title":"Work description","site_name":"Site"}', true),

  (NULL, 'permits.approved',  'Permit to Work Approved',
   'Your permit has been approved: {{permit_number}}',
   'Your Permit to Work has been approved. Work may now commence once the permit is issued.

Permit No: {{permit_number}}
Valid From: {{valid_from}}
Valid Until: {{valid_until}}

Ensure all conditions are met and all workers are briefed before commencing.',
   '{"permit_number":"PTW reference","valid_from":"Start time","valid_until":"Expiry time"}', true),

  (NULL, 'permits.rejected',  'Permit to Work Rejected',
   'Your permit application was rejected: {{permit_number}}',
   'Your Permit to Work application has been reviewed and rejected.

Permit No: {{permit_number}}

Please log in to review the rejection reason and revise your application.',
   '{"permit_number":"PTW reference"}', true),

  (NULL, 'permits.expired',   'Permit to Work Expired',
   'Permit expired: {{permit_number}} — work must stop',
   'The following Permit to Work has expired. All work under this permit must stop immediately.

Permit No: {{permit_number}}
Title: {{permit_title}}

A new permit must be obtained before work can recommence.',
   '{"permit_number":"PTW reference","permit_title":"Work description"}', true)
ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('permits', 'create',     'Apply for a Permit to Work'),
  ('permits', 'read',       'View permit records'),
  ('permits', 'update',     'Edit permit details'),
  ('permits', 'approve',    'Review and approve/reject permits'),
  ('permits', 'issue',      'Issue an approved permit to workers'),
  ('permits', 'close',      'Close completed permits'),
  ('permits', 'cancel',     'Cancel active permits'),
  ('permits', 'export',     'Export permit register')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (
    ('permits','create'),('permits','read'),('permits','update')
  )
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('permits','create'),('permits','read'),('permits','update'),
    ('permits','approve'),('permits','issue'),('permits','close'),('permits','cancel'),('permits','export')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND p.module = 'permits'
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (('permits','read'),('permits','export'))
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module = 'permits'
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
