-- =============================================================
-- HIRING MODULE: Jurisdiction Rules — Seed Data
-- Province employment law rules for ON, BC, AB, QC
-- Effective dates reflect laws current as of 2026.
-- =============================================================

INSERT INTO employment_jurisdiction_rules
  (organisation_id, province_code, rule_type, rule_key, rule_label, rule_value, rule_value_numeric, effective_date, notes, is_active)
VALUES

-- ─── ONTARIO ──────────────────────────────────────────────────────────────────

  -- Minimum wage (ESA 2000, O Reg 285/01)
  (NULL, 'ON', 'minimum_wage', 'min_wage_general',
   'Minimum Wage (General)', '17.20', 17.20, '2024-10-01',
   'Ontario general minimum wage effective Oct 1, 2024', true),

  (NULL, 'ON', 'minimum_wage', 'min_wage_student',
   'Minimum Wage (Student Under 18)', '16.20', 16.20, '2024-10-01',
   'Students under 18 working ≤28 hrs/week during school', true),

  -- Probation (ESA s.54 — no minimum notice during probation ≤3 months)
  (NULL, 'ON', 'probation_max_days', 'probation_max',
   'Maximum Probation Period', '90', 90, '2001-01-01',
   'No statutory termination notice required within first 3 months (90 days) of employment', true),

  -- Statutory holiday pay
  (NULL, 'ON', 'stat_holiday_pay_pct', 'stat_holiday_pay',
   'Vacation / Statutory Holiday Pay', '4', 4.00, '2001-01-01',
   'Minimum 4% vacation pay on regular wages (or 6% after 5 years)', true),

  -- Notice periods (ESA s.57 — termination notice by years)
  (NULL, 'ON', 'notice_period_days', 'notice_less_1_yr',
   'Termination Notice: Less than 1 Year', '7', 7, '2001-01-01',
   '1 week notice required after 3 months but before 1 year', true),

  (NULL, 'ON', 'notice_period_days', 'notice_1_3_yr',
   'Termination Notice: 1–3 Years', '14', 14, '2001-01-01',
   '2 weeks notice required for 1–3 years of service', true),

  -- Required docs
  (NULL, 'ON', 'required_doc', 'esa_poster',
   'ESA "Your Rights Under the ESA" Poster', 'required', NULL, '2001-01-01',
   'Employer must provide the Ministry of Labour ESA poster to all employees', true),

  (NULL, 'ON', 'required_doc', 'ohsa_awareness',
   'OHSA Workplace Safety Awareness Training', 'required', NULL, '2014-07-01',
   'New worker and supervisor awareness training required under O. Reg. 297/13', true),

  -- Fixed-term notice
  (NULL, 'ON', 'fixed_term_notice_required', 'fixed_term_end_date',
   'Fixed-Term Contract Must Have End Date', 'true', NULL, '2001-01-01',
   'Fixed-term contracts must specify an end date or completion of a task', true),

-- ─── BRITISH COLUMBIA ─────────────────────────────────────────────────────────

  (NULL, 'BC', 'minimum_wage', 'min_wage_general',
   'Minimum Wage (General)', '17.40', 17.40, '2024-06-01',
   'BC general minimum wage effective June 1, 2024', true),

  (NULL, 'BC', 'probation_max_days', 'probation_max',
   'Maximum Probation Period', '90', 90, '2019-11-01',
   'Probationary period max 3 months under BC Employment Standards Act s.63', true),

  (NULL, 'BC', 'stat_holiday_pay_pct', 'stat_holiday_pay',
   'Vacation Pay', '4', 4.00, '2019-11-01',
   'Minimum 4% vacation pay (6% after 5 years of employment)', true),

  (NULL, 'BC', 'notice_period_days', 'notice_less_1_yr',
   'Termination Notice: Less than 1 Year', '0', 0, '2019-11-01',
   'No notice required in first 3 months; 1 week after 3–12 months', true),

  (NULL, 'BC', 'notice_period_days', 'notice_1_3_yr',
   'Termination Notice: 1–3 Years', '14', 14, '2019-11-01',
   '2 weeks notice required for 1–3 years of service', true),

  (NULL, 'BC', 'required_doc', 'worksafebc_orientation',
   'WorkSafeBC New Worker Safety Orientation', 'required', NULL, '2012-01-01',
   'Employer must ensure new workers receive safety orientation before starting work', true),

  (NULL, 'BC', 'fixed_term_notice_required', 'fixed_term_end_date',
   'Fixed-Term Contract Must Have End Date', 'true', NULL, '2019-11-01',
   'Fixed-term or task-based contracts must state the end date or completion criteria', true),

-- ─── ALBERTA ──────────────────────────────────────────────────────────────────

  (NULL, 'AB', 'minimum_wage', 'min_wage_general',
   'Minimum Wage (General)', '15.00', 15.00, '2018-10-01',
   'Alberta general minimum wage (no increase since Oct 2018)', true),

  (NULL, 'AB', 'probation_max_days', 'probation_max',
   'Maximum Probation Period', '90', 90, '2019-01-01',
   'Alberta Employment Standards Code — probation max 3 months (90 days)', true),

  (NULL, 'AB', 'stat_holiday_pay_pct', 'stat_holiday_pay',
   'Vacation Pay', '4', 4.00, '2019-01-01',
   'Minimum 4% vacation pay on earnings (6% after 5 years)', true),

  (NULL, 'AB', 'notice_period_days', 'notice_less_2_yr',
   'Termination Notice: Less than 2 Years', '7', 7, '2019-01-01',
   '1 week notice required for 90 days – 2 years of service', true),

  (NULL, 'AB', 'notice_period_days', 'notice_2_4_yr',
   'Termination Notice: 2–4 Years', '14', 14, '2019-01-01',
   '2 weeks notice required for 2–4 years of service', true),

  (NULL, 'AB', 'required_doc', 'ohs_orientation',
   'Alberta OHS New Worker Orientation', 'required', NULL, '2018-06-01',
   'Employers must provide orientation on workplace hazards before work begins (OHS Act s.3)', true),

  (NULL, 'AB', 'fixed_term_notice_required', 'fixed_term_end_date',
   'Fixed-Term Contract Must Have End Date', 'true', NULL, '2019-01-01',
   'Fixed-term employment must have a defined end date', true),

-- ─── QUEBEC ───────────────────────────────────────────────────────────────────

  (NULL, 'QC', 'minimum_wage', 'min_wage_general',
   'Minimum Wage (General)', '15.75', 15.75, '2024-05-01',
   'Quebec general minimum wage effective May 1, 2024', true),

  (NULL, 'QC', 'minimum_wage', 'min_wage_tipped',
   'Minimum Wage (Tipped Employees)', '12.60', 12.60, '2024-05-01',
   'Employees who regularly receive tips — Act Respecting Labour Standards', true),

  (NULL, 'QC', 'probation_max_days', 'probation_max',
   'Maximum Probation Period', '90', 90, '2003-06-01',
   'Quebec Act Respecting Labour Standards — reasonable probation period (generally 3 months)', true),

  (NULL, 'QC', 'stat_holiday_pay_pct', 'stat_holiday_pay',
   'Vacation Pay', '4', 4.00, '2003-06-01',
   'Minimum 4% vacation pay (6% after 3 years of uninterrupted service in QC)', true),

  (NULL, 'QC', 'notice_period_days', 'notice_less_1_yr',
   'Termination Notice: Less than 1 Year', '7', 7, '2003-06-01',
   '1 week notice after 3 months; 2 weeks after 1 year (Act s.82)', true),

  (NULL, 'QC', 'required_doc', 'lsst_training',
   'LSST Health & Safety Training (Bill 59)', 'required', NULL, '2024-01-01',
   'New workers must receive training on their rights under the Act respecting occupational health and safety', true),

  (NULL, 'QC', 'required_doc', 'pay_equity',
   'Pay Equity Program (50+ employees)', 'required_if_applicable', NULL, '2001-11-01',
   'Organisations with 50+ employees must have a pay equity program under the Pay Equity Act', true),

  (NULL, 'QC', 'fixed_term_notice_required', 'fixed_term_end_date',
   'Fixed-Term Contract Must Have End Date', 'true', NULL, '2003-06-01',
   'Fixed-term employment must specify a precise end date or completion of a specific task', true)

ON CONFLICT (organisation_id, province_code, rule_type, rule_key, effective_date) DO NOTHING;
