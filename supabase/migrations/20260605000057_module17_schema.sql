-- =============================================================
-- MODULE 17: Analytics & Reporting — Schema
-- =============================================================
-- Design principles:
--   • KPI definitions are a lookup table — new KPIs added without
--     migrations. formula_sql is the actual query run at compute time.
--   • KPI values are pre-computed and snapshotted on a schedule
--     (daily/weekly/monthly). Reading the dashboard never hits
--     raw operational tables directly.
--   • Workforce hours are first-class data — needed for frequency
--     rate denominators (TRIFR, LTIFR, etc.).
--   • Report definitions and dashboard widget configs are jsonb
--     blobs — the front-end owns the schema inside the config.
--   • Scheduled report deliveries are fully tracked (sent, failed,
--     retrying) so HSE officers can confirm delivery.
--
-- Tables (8):
--   kpi_definitions         — lookup: TRIFR, LTIFR, etc. + formula metadata
--   kpi_snapshots           — pre-computed KPI values by period & scope
--   kpi_targets             — performance targets per KPI per org/site
--   workforce_hours_logs    — hours worked input (TRIFR denominator)
--   report_definitions      — saved custom report configs (jsonb)
--   report_schedules        — scheduled report delivery configs
--   report_execution_log    — log of every report run and delivery
--   dashboard_widget_configs— per-user widget layout and config
-- =============================================================

-- =============================================================
-- KPI DEFINITIONS
-- benchmark_direction: 'lower_is_better' for injury rates;
-- 'higher_is_better' for completion rates.
-- indicator_type: 'lagging' (past failures) or 'leading' (proactive activity).
-- formula_key: used by compute_kpi_snapshot() to select the right logic.
-- =============================================================

CREATE TABLE kpi_definitions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text        NOT NULL UNIQUE,
  name                  text        NOT NULL,
  short_name            text        NOT NULL,   -- for chart labels
  description           text,
  formula_description   text,                   -- plain-language formula
  formula_key           text        NOT NULL UNIQUE, -- matches CASE in compute function
  unit                  text        NOT NULL,   -- '%', 'rate per million hrs', 'days', 'score'
  decimal_places        integer     NOT NULL DEFAULT 2,
  indicator_type        text        NOT NULL DEFAULT 'lagging'
                                    CHECK (indicator_type IN ('lagging','leading')),
  benchmark_direction   text        NOT NULL DEFAULT 'lower_is_better'
                                    CHECK (benchmark_direction IN ('lower_is_better','higher_is_better')),
  is_frequency_rate     boolean     NOT NULL DEFAULT false,  -- requires hours worked denominator
  is_active             boolean     NOT NULL DEFAULT true,
  display_order         integer     NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- KPI SNAPSHOTS
-- Pre-computed values. One row per (kpi, org, site, period).
-- period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
-- numerator / denominator stored for transparency.
-- is_current: only the latest snapshot for each scope is current.
-- =============================================================

CREATE TABLE kpi_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_definition_id   uuid        NOT NULL REFERENCES kpi_definitions(id),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  site_id             uuid        REFERENCES sites(id),   -- NULL = org-wide aggregate
  period_type         text        NOT NULL
                                  CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
  period_start        date        NOT NULL,
  period_end          date        NOT NULL,
  value               decimal(18,4),
  numerator           decimal(18,4),
  denominator         decimal(18,4),
  is_current          boolean     NOT NULL DEFAULT true,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kpi_definition_id, organisation_id, site_id, period_type, period_start)
);

-- =============================================================
-- KPI TARGETS
-- Performance targets set by HSE officers or management.
-- target_direction: 'below' target value or 'above' target value.
-- =============================================================

CREATE TABLE kpi_targets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_definition_id   uuid        NOT NULL REFERENCES kpi_definitions(id),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  site_id             uuid        REFERENCES sites(id),
  period_type         text        NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly')),
  target_value        decimal(18,4) NOT NULL,
  target_direction    text        NOT NULL DEFAULT 'below'
                                  CHECK (target_direction IN ('below','above','equal')),
  effective_from      date        NOT NULL,
  effective_to        date,
  set_by              uuid        REFERENCES auth.users(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kpi_definition_id, organisation_id, site_id, period_type, effective_from)
);

-- =============================================================
-- WORKFORCE HOURS LOGS
-- Manually entered or system-calculated total hours worked per
-- site per period. This is the denominator for all frequency rates
-- (TRIFR, LTIFR, Near Miss Rate, etc.).
-- Can be entered weekly or monthly by HR / payroll team.
-- =============================================================

CREATE TABLE workforce_hours_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  site_id         uuid        REFERENCES sites(id),
  department_id   uuid        REFERENCES departments(id),
  period_start    date        NOT NULL,
  period_end      date        NOT NULL,
  hours_worked    decimal(12,2) NOT NULL CHECK (hours_worked >= 0),
  headcount       integer,      -- number of workers during this period
  source          text        NOT NULL DEFAULT 'manual'
                              CHECK (source IN ('manual','payroll_import','hris_sync','estimated')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (organisation_id, site_id, department_id, period_start, period_end)
);

-- =============================================================
-- REPORT DEFINITIONS
-- Saved custom report configurations.
-- config jsonb holds the full front-end report structure:
-- { blocks: [...], filters: {...}, layout: [...] }
-- is_shared: visible to all elevated roles in the org.
-- is_system_template: seeded templates that appear for all orgs.
-- =============================================================

CREATE TABLE report_definitions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES organisations(id),  -- NULL = system template
  name            text        NOT NULL,
  description     text,
  category        text        NOT NULL DEFAULT 'custom'
                              CHECK (category IN ('executive','operational','compliance','custom','system_template')),
  config          jsonb       NOT NULL DEFAULT '{}',
  is_shared       boolean     NOT NULL DEFAULT false,
  is_system_template boolean  NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- REPORT SCHEDULES
-- Recurring automated report delivery.
-- recipients jsonb: [{"email": "...", "name": "...", "user_id": "..."}]
-- =============================================================

CREATE TABLE report_schedules (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id uuid     NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  name              text        NOT NULL,
  frequency         text        NOT NULL
                                CHECK (frequency IN ('daily','weekly','monthly','quarterly')),
  day_of_week       integer     CHECK (day_of_week BETWEEN 0 AND 6),   -- 0=Sunday, for weekly
  day_of_month      integer     CHECK (day_of_month BETWEEN 1 AND 28), -- for monthly
  time_of_day       time,
  recipients        jsonb       NOT NULL DEFAULT '[]',
  delivery_format   text        NOT NULL DEFAULT 'pdf'
                                CHECK (delivery_format IN ('pdf','xlsx','csv')),
  include_period    text        NOT NULL DEFAULT 'last_month'
                                CHECK (include_period IN ('yesterday','last_week','last_month','last_quarter','last_year','year_to_date')),
  is_active         boolean     NOT NULL DEFAULT true,
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- REPORT EXECUTION LOG
-- Append-only log of every report run (manual or scheduled).
-- =============================================================

CREATE TABLE report_execution_log (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id  uuid        REFERENCES report_definitions(id),
  schedule_id           uuid        REFERENCES report_schedules(id),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  triggered_by          uuid        REFERENCES auth.users(id),  -- NULL = scheduled
  trigger_type          text        NOT NULL DEFAULT 'manual'
                                    CHECK (trigger_type IN ('manual','scheduled')),
  period_start          date,
  period_end            date,
  status                text        NOT NULL DEFAULT 'running'
                                    CHECK (status IN ('running','completed','failed')),
  storage_path          text,       -- generated file in Supabase Storage
  file_size             bigint,
  recipients_notified   integer     NOT NULL DEFAULT 0,
  error_message         text,
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE RULE no_update_report_execution
  AS ON UPDATE TO report_execution_log DO INSTEAD NOTHING;
CREATE RULE no_delete_report_execution
  AS ON DELETE TO report_execution_log DO INSTEAD NOTHING;

-- =============================================================
-- DASHBOARD WIDGET CONFIGS
-- Per-user widget layout and configuration.
-- dashboard_type: 'executive' | 'hse' | 'operational'
-- config jsonb: { widgets: [{id, type, position, size, ...}] }
-- =============================================================

CREATE TABLE dashboard_widget_configs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  dashboard_type  text        NOT NULL DEFAULT 'operational'
                              CHECK (dashboard_type IN ('executive','hse','operational','custom')),
  config          jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dashboard_type)
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_kpi_snap_org_period    ON kpi_snapshots(organisation_id, period_type, period_start DESC);
CREATE INDEX idx_kpi_snap_kpi_site      ON kpi_snapshots(kpi_definition_id, site_id, period_end DESC);
CREATE INDEX idx_kpi_snap_current       ON kpi_snapshots(organisation_id, kpi_definition_id) WHERE is_current = true;
CREATE INDEX idx_kpi_targets_org        ON kpi_targets(organisation_id, kpi_definition_id);
CREATE INDEX idx_whl_org_period         ON workforce_hours_logs(organisation_id, period_start, period_end);
CREATE INDEX idx_whl_site_period        ON workforce_hours_logs(site_id, period_start, period_end);
CREATE INDEX idx_rdef_org_category      ON report_definitions(organisation_id, category);
CREATE INDEX idx_rsched_next_run        ON report_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_rlog_org               ON report_execution_log(organisation_id, started_at DESC);
CREATE INDEX idx_rlog_schedule          ON report_execution_log(schedule_id, started_at DESC);
CREATE INDEX idx_dwc_user               ON dashboard_widget_configs(user_id);
