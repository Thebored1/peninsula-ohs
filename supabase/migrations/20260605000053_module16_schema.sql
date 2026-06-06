-- =============================================================
-- MODULE 16: Health Surveillance — Schema
-- =============================================================
-- Manages occupational health monitoring programs — who must be
-- tested, how often, and what was found (high-level fit/refer
-- outcomes only; no clinical records stored).
--
-- Tables (10):
--   health_surveillance_types    — lookup: audiometry, spirometry, blood_lead, etc.
--   surveillance_programs        — named programs (e.g. "Noise-Exposed Workers")
--   surveillance_program_links   — which roles/sites/users are in each program
--   surveillance_program_tests   — required tests per program + frequency
--   worker_health_profiles       — per-worker surveillance tracking record
--   health_check_schedules       — upcoming due checks per worker
--   health_check_records         — completed check results (fit/refer outcomes)
--   work_restriction_types       — lookup: no_heavy_lifting, no_heights, etc.
--   worker_work_restrictions     — active work restrictions per worker
--   return_to_work_plans         — RTW plans for injured/ill workers
--   return_to_work_plan_steps    — individual steps in an RTW plan
-- =============================================================

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

-- exposure_hazard: the hazard this type of surveillance monitors.
-- Used to auto-assign surveillance when a worker's role has that hazard.
CREATE TABLE health_surveillance_types (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text        NOT NULL UNIQUE,
  name             text        NOT NULL,
  description      text,
  exposure_hazard  text,       -- 'noise','dust','lead','vibration','chemical', etc.
  default_frequency_months integer NOT NULL DEFAULT 12,
  requires_baseline boolean    NOT NULL DEFAULT true,
  icon             text,
  display_order    integer     NOT NULL DEFAULT 0,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE work_restriction_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true
);

-- =============================================================
-- SURVEILLANCE PROGRAMS
-- An HSE officer defines a program (e.g. "Noise-Exposed Workers")
-- that links to a set of required tests with frequencies.
-- Workers are enrolled via surveillance_program_links.
-- =============================================================

CREATE TABLE surveillance_programs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  name             text        NOT NULL,
  description      text,
  exposure_hazard  text,       -- what hazard this program monitors
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id)
);

-- A program can require workers based on role, site, department, or individual.
-- Exactly one of (role_id, site_id, department_id, user_id) should be set;
-- CHECK constraint enforces this.
CREATE TABLE surveillance_program_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      uuid        NOT NULL REFERENCES surveillance_programs(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  role_id         uuid        REFERENCES roles(id),
  site_id         uuid        REFERENCES sites(id),
  department_id   uuid        REFERENCES departments(id),
  user_id         uuid        REFERENCES auth.users(id),
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (role_id IS NOT NULL)::int + (site_id IS NOT NULL)::int +
    (department_id IS NOT NULL)::int + (user_id IS NOT NULL)::int = 1
  )
);

-- Required tests within a program. A program can require multiple tests.
CREATE TABLE surveillance_program_tests (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id           uuid        NOT NULL REFERENCES surveillance_programs(id) ON DELETE CASCADE,
  surveillance_type_id uuid        NOT NULL REFERENCES health_surveillance_types(id),
  frequency_months     integer     NOT NULL DEFAULT 12,
  baseline_required    boolean     NOT NULL DEFAULT true,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- WORKER HEALTH PROFILES
-- One row per worker — tracks enrollment, overall status,
-- and when they last had various checks.
-- =============================================================

CREATE TABLE worker_health_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) UNIQUE,
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  overall_status      text        NOT NULL DEFAULT 'fit'
                                  CHECK (overall_status IN ('fit','fit_with_restrictions','temporarily_unfit','pending_review')),
  has_active_restrictions boolean NOT NULL DEFAULT false,
  last_check_date     date,
  next_check_due      date,
  notes               text,       -- non-clinical notes (e.g. "enrolled 2026-01")
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- HEALTH CHECK SCHEDULES
-- Upcoming or overdue health checks per worker per test type.
-- Created automatically when a worker is enrolled in a program,
-- and re-created after each completed check.
-- =============================================================

CREATE TABLE health_check_schedules (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id),
  organisation_id      uuid        NOT NULL REFERENCES organisations(id),
  program_id           uuid        REFERENCES surveillance_programs(id),
  surveillance_type_id uuid        NOT NULL REFERENCES health_surveillance_types(id),
  due_date             date        NOT NULL,
  is_baseline          boolean     NOT NULL DEFAULT false,
  is_overdue           boolean     NOT NULL DEFAULT false,
  is_completed         boolean     NOT NULL DEFAULT false,
  completed_check_id   uuid,       -- FK set when completed (deferred)
  reminder_sent_at     timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- HEALTH CHECK RECORDS
-- Completed health check results. Outcomes are high-level only
-- (fit/fit_with_restrictions/temporarily_unfit/refer/not_completed).
-- No clinical data, diagnoses, or full medical records are stored.
-- =============================================================

CREATE TABLE health_check_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  schedule_id           uuid        REFERENCES health_check_schedules(id),
  surveillance_type_id  uuid        NOT NULL REFERENCES health_surveillance_types(id),
  program_id            uuid        REFERENCES surveillance_programs(id),

  check_number          text        UNIQUE,   -- HC-YYYY-NNNNN

  -- The only outcome values stored — deliberately non-clinical
  result                text        NOT NULL
                                    CHECK (result IN (
                                      'fit','fit_with_restrictions',
                                      'temporarily_unfit','refer_specialist',
                                      'pending','not_completed'
                                    )),
  result_notes          text,       -- brief non-clinical notes (e.g. "monitoring required")

  -- Who conducted the check (external provider)
  provider_name         text,
  provider_reference    text,       -- provider's own reference/report number
  check_date            date        NOT NULL,
  next_check_due        date,

  -- Deferred restrictions (if applicable)
  restrictions_issued   boolean     NOT NULL DEFAULT false,
  is_baseline           boolean     NOT NULL DEFAULT false,

  -- File attachment (provider report — access tightly controlled)
  report_storage_path   text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  recorded_by           uuid        REFERENCES auth.users(id)
);

-- Deferred FK for schedule's completed_check_id
ALTER TABLE health_check_schedules
  ADD CONSTRAINT fk_completed_check
  FOREIGN KEY (completed_check_id) REFERENCES health_check_records(id) ON DELETE SET NULL;

-- =============================================================
-- WORKER WORK RESTRICTIONS
-- Active work restrictions against a worker based on a health
-- check result. Enforced operationally, not technically.
-- =============================================================

CREATE TABLE worker_work_restrictions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id),
  organisation_id      uuid        NOT NULL REFERENCES organisations(id),
  check_record_id      uuid        REFERENCES health_check_records(id),
  restriction_type_id  uuid        NOT NULL REFERENCES work_restriction_types(id),
  description          text        NOT NULL,
  imposed_date         date        NOT NULL DEFAULT CURRENT_DATE,
  review_date          date,
  lifted_date          date,
  lifted_by            uuid        REFERENCES auth.users(id),
  is_active            boolean     NOT NULL GENERATED ALWAYS AS (lifted_date IS NULL) STORED,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- RETURN TO WORK PLANS
-- Plans for workers returning from injury or illness.
-- =============================================================

CREATE TABLE return_to_work_plans (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  incident_id       uuid        REFERENCES incidents(id) ON DELETE SET NULL,
  plan_number       text        UNIQUE,    -- RTW-YYYY-NNNNN
  injury_description text       NOT NULL,
  proposed_return_date date,
  actual_return_date   date,
  treating_provider text,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','on_hold','completed','cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id)
);

CREATE TABLE return_to_work_plan_steps (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid        NOT NULL REFERENCES return_to_work_plans(id) ON DELETE CASCADE,
  organisation_id uuid      NOT NULL REFERENCES organisations(id),
  step_number   integer     NOT NULL,
  title         text        NOT NULL,
  description   text,
  start_date    date,
  end_date      date,
  hours_per_day decimal(4,1),
  duties        text,       -- what duties the worker can perform at this stage
  is_completed  boolean     NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_spl_program_id        ON surveillance_program_links(program_id);
CREATE INDEX idx_spl_user_id           ON surveillance_program_links(user_id);
CREATE INDEX idx_spl_role_id           ON surveillance_program_links(role_id);
CREATE INDEX idx_spt_program_id        ON surveillance_program_tests(program_id);

CREATE INDEX idx_whp_user_id           ON worker_health_profiles(user_id);
CREATE INDEX idx_whp_org_status        ON worker_health_profiles(organisation_id, overall_status);

CREATE INDEX idx_hcs_user_id           ON health_check_schedules(user_id, due_date);
CREATE INDEX idx_hcs_org_due           ON health_check_schedules(organisation_id, due_date)
                                       WHERE is_completed = false;
CREATE INDEX idx_hcs_overdue           ON health_check_schedules(organisation_id)
                                       WHERE is_overdue = true AND is_completed = false;

CREATE INDEX idx_hcr_user_id           ON health_check_records(user_id, check_date DESC);
CREATE INDEX idx_hcr_org_result        ON health_check_records(organisation_id, result);
CREATE INDEX idx_hcr_number            ON health_check_records(check_number);

CREATE INDEX idx_wwr_user_id           ON worker_work_restrictions(user_id) WHERE is_active = true;
CREATE INDEX idx_wwr_org_active        ON worker_work_restrictions(organisation_id) WHERE is_active = true;

CREATE INDEX idx_rtwp_user_id          ON return_to_work_plans(user_id);
CREATE INDEX idx_rtwp_org_status       ON return_to_work_plans(organisation_id, status);
CREATE INDEX idx_rtwps_plan_id         ON return_to_work_plan_steps(plan_id, step_number);
