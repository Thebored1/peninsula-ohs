-- =============================================================
-- MODULE 7: Seed Data — Risk Register
-- =============================================================

-- =============================================================
-- RISK LIKELIHOOD LEVELS (1–5)
-- =============================================================

INSERT INTO risk_likelihood_levels (level_number, name, description) VALUES
  (1, 'Rare',           'May occur only in exceptional circumstances. Has not occurred in industry or is theoretically possible but highly unlikely.'),
  (2, 'Unlikely',       'Could occur at some time. Incident has occurred elsewhere in the industry but not at this site.'),
  (3, 'Possible',       'Might occur at some time. Incident has occurred at this site or similar sites previously.'),
  (4, 'Likely',         'Will probably occur in most circumstances. Incident occurs several times per year across the organisation.'),
  (5, 'Almost Certain', 'Is expected to occur in most circumstances. Incident occurs regularly or is likely to occur.')
ON CONFLICT (level_number) DO NOTHING;

-- =============================================================
-- RISK CONSEQUENCE LEVELS (1–5)
-- =============================================================

INSERT INTO risk_consequence_levels (level_number, name, description) VALUES
  (1, 'Negligible', 'No injury or minor first aid only. Negligible environmental impact. Minimal property damage. No regulatory consequence.'),
  (2, 'Minor',      'Minor injury requiring medical treatment. Minor reversible environmental impact. Minor property damage < $10k. Minor regulatory breach.'),
  (3, 'Moderate',   'Moderate injury — lost time or restricted duties (1–7 days). Contained environmental impact. Moderate property damage $10k–$100k. Regulatory investigation.'),
  (4, 'Major',      'Serious injury — hospitalisation or lost time > 7 days, or multiple injuries. Significant environmental impact. Property damage $100k–$1M. Regulatory prosecution.'),
  (5, 'Fatal',      'Death or permanent total disability. Catastrophic environmental impact requiring significant remediation. Property damage > $1M. Criminal prosecution.')
ON CONFLICT (level_number) DO NOTHING;

-- =============================================================
-- RISK MATRIX THRESHOLDS (5×5 Standard Matrix)
-- Score = Likelihood × Consequence
-- 1–4: Low  |  5–9: Medium  |  10–16: High  |  17–25: Critical
-- =============================================================

INSERT INTO risk_matrix_thresholds (label, min_score, max_score, colour_code, description, sort_order) VALUES
  ('Low',      1,  4,  '#22c55e', 'Acceptable risk. Manage with routine procedures. Review annually.', 1),
  ('Medium',   5,  9,  '#eab308', 'Moderate risk. Implement additional controls. Review quarterly.', 2),
  ('High',    10, 16,  '#f97316', 'Significant risk. Senior management attention required. Review monthly.', 3),
  ('Critical',17, 25,  '#ef4444', 'Unacceptable risk. Immediate action required. Stop activity if necessary. CEO/Board notification.', 4)
ON CONFLICT (label) DO NOTHING;

-- =============================================================
-- RISK CATEGORIES
-- =============================================================

INSERT INTO risk_categories (code, name, description, icon, display_order) VALUES
  ('physical',        'Physical',         'Noise, vibration, radiation, extreme temperatures, lighting, pressure.', 'zap', 1),
  ('chemical',        'Chemical',         'Hazardous substances, dusts, fumes, solvents, gases, biological fluids.', 'flask', 2),
  ('biological',      'Biological',       'Bacteria, viruses, fungi, parasites, plants, and animal matter.', 'microscope', 3),
  ('ergonomic',       'Ergonomic',        'Manual handling, repetitive movements, awkward postures, workstation design.', 'user', 4),
  ('psychological',   'Psychological',    'Workplace stress, bullying, fatigue, shift work, job demands, violence.', 'brain', 5),
  ('mechanical',      'Mechanical',       'Moving parts, cutting edges, stored energy, vehicles and mobile plant.', 'settings', 6),
  ('electrical',      'Electrical',       'Electrical shock, arc flash, static discharge, damaged equipment.', 'zap', 7),
  ('fire_explosion',  'Fire / Explosion', 'Flammable materials, ignition sources, confined spaces, hot work.', 'flame', 8),
  ('environmental',   'Environmental',    'Spills, emissions, waste disposal, ground contamination, water bodies.', 'leaf', 9),
  ('gravitational',   'Gravitational',    'Working at height, falling objects, unstable structures, excavations.', 'arrow-down', 10)
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- NOTIFICATION TEMPLATES
-- =============================================================

INSERT INTO notification_templates
  (organisation_id, trigger_event, name,
   subject_template, body_template, available_vars, is_active)
VALUES

  (NULL, 'risks.high_risk_created',
   'High / Critical Risk Identified',
   '{{risk_level}} risk identified: {{risk_number}} — {{risk_title}}',
   'A {{risk_level}} risk has been added to the risk register and requires your attention.

Risk No: {{risk_number}}
Title: {{risk_title}}
Score: {{risk_score}} / 25
Site: {{site_name}}

Log in to review the risk assessment, confirm controls are in place, and assign a risk owner.',
   '{"risk_number":"Risk reference","risk_title":"Risk title","risk_level":"Risk level (High or Critical)","risk_score":"Risk score out of 25","site_name":"Site name"}',
   true),

  (NULL, 'risks.hazard_report_submitted',
   'Hazard Report Submitted',
   'Hazard report submitted: {{report_number}} at {{site_name}}',
   'A worker has submitted a hazard report that requires your review.

Report No: {{report_number}}
Title: {{report_title}}
Site: {{site_name}}
Perceived Severity: {{severity}}

Log in to review the hazard report and determine whether it should be actioned or promoted to the risk register.',
   '{"report_number":"Report reference","report_title":"Hazard report title","site_name":"Site name","severity":"Reporter''s perceived severity"}',
   true),

  (NULL, 'risks.hazard_promoted',
   'Hazard Report Promoted to Risk Register',
   'Your hazard report {{report_number}} has been assessed and added to the risk register',
   'Thank you for reporting a hazard. It has been reviewed and added to the formal risk register.

Original Report: {{report_number}}
Risk Register Entry: {{risk_number}} — {{risk_title}}

Your report helps keep the workplace safe.',
   '{"report_number":"Original hazard report reference","risk_number":"New risk register number","risk_title":"Risk title"}',
   true),

  (NULL, 'risks.review_completed',
   'Risk Review Completed',
   'Risk review completed: {{risk_number}}',
   'Your risk has been formally reviewed.

Risk No: {{risk_number}}
Title: {{risk_title}}
Next Review Due: {{next_review}}

Log in to view the updated risk assessment.',
   '{"risk_number":"Risk reference","risk_title":"Risk title","next_review":"Next scheduled review date"}',
   true),

  (NULL, 'risks.review_overdue',
   'Risk Review Overdue',
   'Risk review overdue: {{risk_number}}',
   'A scheduled risk review is now overdue.

Risk No: {{risk_number}}
Title: {{risk_title}}
Review Was Due: {{due_date}}

Please log in to complete the overdue risk review.',
   '{"risk_number":"Risk reference","risk_title":"Risk title","due_date":"When the review was due"}',
   true)

ON CONFLICT (organisation_id, trigger_event, name) DO NOTHING;

-- =============================================================
-- NEW PERMISSIONS
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES
  ('risks', 'create',      'Create formal risk register entries'),
  ('risks', 'read',        'View the risk register'),
  ('risks', 'update',      'Edit risk assessments and controls'),
  ('risks', 'delete',      'Close or delete risk register entries'),
  ('risks', 'approve',     'Approve risk assessments and review outcomes'),
  ('risks', 'export',      'Export risk register to CSV / PDF'),
  ('hazard_reports', 'create', 'Submit hazard reports'),
  ('hazard_reports', 'read',   'View hazard reports'),
  ('hazard_reports', 'review', 'Review and action hazard reports'),
  ('hazard_reports', 'promote','Promote hazard reports to the risk register')
ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS
-- =============================================================

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),

worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      ('risks',          'read'),
      ('hazard_reports', 'create'),
      ('hazard_reports', 'read')
    )
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('risks',          'create'),
      ('risks',          'read'),
      ('risks',          'update'),
      ('risks',          'export'),
      ('hazard_reports', 'create'),
      ('hazard_reports', 'read'),
      ('hazard_reports', 'review'),
      ('hazard_reports', 'promote')
    )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('risks',          'create'),
      ('risks',          'read'),
      ('risks',          'update'),
      ('risks',          'delete'),
      ('risks',          'approve'),
      ('risks',          'export'),
      ('hazard_reports', 'create'),
      ('hazard_reports', 'read'),
      ('hazard_reports', 'review'),
      ('hazard_reports', 'promote')
    )
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('risks',          'read'),
      ('risks',          'export'),
      ('hazard_reports', 'read')
    )
),
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
    AND p.module IN ('risks', 'hazard_reports')
),
all_mappings AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms
  UNION ALL SELECT * FROM system_admin_perms
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, perm_id FROM all_mappings
ON CONFLICT (role_id, permission_id) DO NOTHING;
