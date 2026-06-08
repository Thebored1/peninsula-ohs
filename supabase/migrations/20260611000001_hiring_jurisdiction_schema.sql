-- =============================================================
-- HIRING MODULE: Jurisdiction Employment Rules — Schema
-- =============================================================
-- Stores province-specific employment law rules used by the
-- hiring workflow compliance checker (Step 4).
-- NULL organisation_id = Peninsula system rule (visible to all orgs).
-- Non-NULL = org override for that province.
-- =============================================================

CREATE TABLE employment_jurisdiction_rules (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  province_code       text        NOT NULL,
  rule_type           text        NOT NULL CHECK (rule_type IN (
                        'minimum_wage',
                        'probation_max_days',
                        'notice_period_days',
                        'required_doc',
                        'required_clause',
                        'stat_holiday_pay_pct',
                        'fixed_term_notice_required'
                      )),
  rule_key            text        NOT NULL,
  rule_label          text        NOT NULL,
  rule_value          text        NOT NULL,
  rule_value_numeric  numeric,
  effective_date      date        NOT NULL,
  expiry_date         date,
  notes               text,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id),

  UNIQUE (organisation_id, province_code, rule_type, rule_key, effective_date)
);

CREATE INDEX idx_ejr_province_type  ON employment_jurisdiction_rules(province_code, rule_type);
CREATE INDEX idx_ejr_org_province   ON employment_jurisdiction_rules(organisation_id, province_code);
CREATE INDEX idx_ejr_active         ON employment_jurisdiction_rules(is_active) WHERE is_active = true;
