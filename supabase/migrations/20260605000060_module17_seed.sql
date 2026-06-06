-- =============================================================
-- MODULE 17: Seed Data — Analytics & Reporting
-- =============================================================

INSERT INTO kpi_definitions (code, name, short_name, description, formula_description, formula_key, unit, decimal_places, indicator_type, benchmark_direction, is_frequency_rate, display_order) VALUES
  ('TRIFR',
   'Total Recordable Injury Frequency Rate',
   'TRIFR',
   'Measures the frequency of all recordable workplace injuries (requiring medical treatment, hospitalisation, or fatal) per million hours worked.',
   '(Recordable injuries × 1,000,000) ÷ Total hours worked',
   'trifr', 'per M hrs', 2, 'lagging', 'lower_is_better', true, 1),

  ('LTIFR',
   'Lost Time Injury Frequency Rate',
   'LTIFR',
   'Measures the frequency of injuries causing at least one day of lost time per million hours worked.',
   '(Lost time injuries × 1,000,000) ÷ Total hours worked',
   'ltifr', 'per M hrs', 2, 'lagging', 'lower_is_better', true, 2),

  ('SEVERITY_RATE',
   'Severity Rate',
   'Severity',
   'Measures the total days lost due to workplace injury per million hours worked.',
   '(Total days lost × 1,000,000) ÷ Total hours worked',
   'severity_rate', 'days per M hrs', 2, 'lagging', 'lower_is_better', true, 3),

  ('NEAR_MISS_RATE',
   'Near Miss Rate',
   'Near Miss',
   'Frequency of near miss incidents reported per million hours worked. A leading indicator when rising (more reporting = better culture).',
   '(Near miss reports × 1,000,000) ÷ Total hours worked',
   'near_miss_rate', 'per M hrs', 2, 'leading', 'higher_is_better', true, 4),

  ('INSP_COMPLETION',
   'Inspection Completion Rate',
   'Insp. Completion',
   'Percentage of scheduled inspections completed on time.',
   '(On-time completed inspections ÷ Total scheduled inspections) × 100',
   'inspection_completion_rate', '%', 1, 'leading', 'higher_is_better', false, 5),

  ('ACTION_CLOSURE',
   'Action Closure Rate',
   'CAPA Closure',
   'Percentage of CAPA actions closed on or before their due date.',
   '(Actions closed on time ÷ Total actions due) × 100',
   'action_closure_rate', '%', 1, 'leading', 'higher_is_better', false, 6),

  ('AUDIT_SCORE',
   'Audit Conformance Score',
   'Audit Score',
   'Average percentage of audit criteria rated as conforming across all completed audits in the period.',
   'Average (conformance count ÷ total criteria × 100) per completed audit',
   'audit_score', '%', 1, 'leading', 'higher_is_better', false, 7),

  ('HAZARD_RATE',
   'Hazard Report Rate',
   'Hazard Rate',
   'Frequency of hazard reports submitted per million hours worked. A leading indicator — higher means stronger safety culture.',
   '(Hazard reports × 1,000,000) ÷ Total hours worked',
   'hazard_report_rate', 'per M hrs', 2, 'leading', 'higher_is_better', true, 8)
ON CONFLICT (code) DO NOTHING;

-- System report templates (organisation_id NULL = global)
INSERT INTO report_definitions (organisation_id, name, description, category, is_shared, is_system_template, config) VALUES
  (NULL, 'Executive Safety Dashboard',
   'High-level KPIs with trend lines for senior leadership.',
   'executive', true, true,
   '{"blocks":[{"type":"kpi_tiles","kpis":["TRIFR","LTIFR","ACTION_CLOSURE","INSP_COMPLETION"]},{"type":"trend_chart","kpi":"TRIFR","period":"12_months"},{"type":"trend_chart","kpi":"LTIFR","period":"12_months"},{"type":"site_comparison","metric":"TRIFR"}]}'),

  (NULL, 'Monthly HSE Report',
   'Standard monthly safety performance report covering all KPIs, incidents, and actions.',
   'operational', true, true,
   '{"blocks":[{"type":"kpi_summary","period":"current_month"},{"type":"incident_table","period":"current_month"},{"type":"action_status","period":"current_month"},{"type":"inspection_completion","period":"current_month"},{"type":"hazard_reports","period":"current_month"}]}'),

  (NULL, 'Incident Analytics',
   'Breakdown of incidents by type, location, time of day, and day of week.',
   'operational', true, true,
   '{"blocks":[{"type":"incident_by_type"},{"type":"incident_by_site"},{"type":"incident_heatmap","x":"hour_of_day","y":"day_of_week"},{"type":"incident_trend","period":"12_months"},{"type":"severity_breakdown"}]}'),

  (NULL, 'Compliance Status Report',
   'Overview of regulatory compliance including overdue actions, expiring documents, and inspection status.',
   'compliance', true, true,
   '{"blocks":[{"type":"overdue_actions"},{"type":"expiring_documents"},{"type":"permit_status"},{"type":"audit_findings_open"},{"type":"sds_review_due"}]}')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('analytics', 'read',             'View analytics dashboards and KPIs'),
  ('analytics', 'manage_targets',   'Set and manage KPI targets'),
  ('analytics', 'create_reports',   'Create custom report definitions'),
  ('analytics', 'schedule_reports', 'Schedule automated report delivery'),
  ('analytics', 'export',           'Export report data'),
  ('analytics', 'manage_hours',     'Enter workforce hours worked data')
ON CONFLICT (module, action) DO NOTHING;

WITH perm AS (SELECT id, module, action FROM permissions),
role_ids AS (SELECT id, name FROM roles WHERE is_system_role = true),
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Worker' AND (p.module, p.action) IN (('analytics','read'))
),
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Supervisor' AND (p.module, p.action) IN (
    ('analytics','read'),('analytics','create_reports'),('analytics','export'),('analytics','manage_hours')
  )
),
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer' AND p.module = 'analytics'
),
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'Executive' AND (p.module, p.action) IN (
    ('analytics','read'),('analytics','create_reports'),('analytics','export')
  )
),
admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id FROM role_ids r, perm p
  WHERE r.name = 'System Admin' AND p.module = 'analytics'
),
all_m AS (
  SELECT * FROM worker_perms UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms UNION ALL SELECT * FROM executive_perms UNION ALL SELECT * FROM admin_perms
)
INSERT INTO role_permissions (role_id, permission_id) SELECT role_id, perm_id FROM all_m
ON CONFLICT (role_id, permission_id) DO NOTHING;
