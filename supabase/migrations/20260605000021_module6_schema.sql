-- =============================================================
-- MODULE 6: Inspections & Checklists — Core Schema
-- =============================================================
-- Tables (9):
--   inspection_types             — lookup: 8 inspection categories
--   inspection_templates         — checklist template header + scoring config
--   inspection_template_sections — named groups within a template
--   inspection_template_questions— individual checklist items with type + scoring
--   inspection_schedules         — recurring and one-time inspection assignments
--   inspections                  — a conducted inspection instance
--   inspection_responses         — per-question answers with fail detection
--   inspection_response_evidence — photos / files attached to individual responses
--   inspection_actions           — links a failed response to a generated CAPA action
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE inspection_status_enum AS ENUM (
  'scheduled',    -- created by schedule; not yet started
  'draft',        -- started but not finished
  'in_progress',  -- actively being conducted
  'completed',    -- all required questions answered; ready to submit
  'submitted',    -- formally submitted / signed off
  'cancelled'
);

CREATE TYPE inspection_result_enum AS ENUM (
  'pass',             -- score >= threshold, no hard fails
  'conditional_pass', -- score >= threshold but has failed items
  'fail'              -- score < threshold
);

CREATE TYPE question_type_enum AS ENUM (
  'pass_fail',
  'yes_no',
  'numeric',
  'text',
  'multiple_choice',
  'photo',
  'signature',
  'date_time'
);

CREATE TYPE recurrence_type_enum AS ENUM (
  'once',
  'daily',
  'weekly',
  'monthly',
  'custom'   -- arbitrary cron expression
);

-- =============================================================
-- INSPECTION TYPES
-- Kept as a table — new types are added without migrations.
-- =============================================================

CREATE TABLE inspection_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INSPECTION TEMPLATES
-- The master checklist definition. version increments on each
-- published change. Inspections snapshot the template version
-- they were conducted against.
-- =============================================================

CREATE TABLE inspection_templates (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id           uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  inspection_type_id        uuid        NOT NULL REFERENCES inspection_types(id),
  name                      text        NOT NULL,
  description               text,
  instructions              text,       -- shown to the inspector before they start
  version                   integer     NOT NULL DEFAULT 1,
  is_published              boolean     NOT NULL DEFAULT false,
  passing_score_threshold   decimal(5,2) NOT NULL DEFAULT 80.00,  -- % score to pass
  score_below_threshold_msg text,       -- message shown when threshold is breached
  estimated_duration_minutes integer,
  applicable_site_types     text[],     -- [] = applies to all sites
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  created_by                uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- TEMPLATE SECTIONS
-- Optional groupings within a template for long checklists.
-- Questions reference a section for display grouping.
-- =============================================================

CREATE TABLE inspection_template_sections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid        NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  order_index  integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- TEMPLATE QUESTIONS
-- Individual checklist items. Supports 8 question types.
--
-- fail_condition (jsonb) defines what constitutes a failure:
--   pass_fail:      implicit — 'fail' value = failure
--   yes_no:         {"fail_on": "no"}
--   numeric:        {"min": 0, "max": 100}
--   multiple_choice:{"fail_values": ["Option C", "Option D"]}
--   photo/signature/text/date_time: fail_condition ignored;
--     these are required-or-not, never auto-failed by value.
--
-- action_required_on_fail: if true, failing this question
--   creates a CAPA action (via create_inspection_action()).
-- =============================================================

CREATE TABLE inspection_template_questions (
  id                      uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id             uuid               NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
  section_id              uuid               REFERENCES inspection_template_sections(id) ON DELETE SET NULL,
  question_text           text               NOT NULL,
  help_text               text,              -- additional guidance shown during inspection
  question_type           question_type_enum NOT NULL,
  is_required             boolean            NOT NULL DEFAULT true,
  is_scored               boolean            NOT NULL DEFAULT true,  -- whether this counts in score
  weight                  integer            NOT NULL DEFAULT 1,     -- relative weight for scoring
  options                 jsonb,             -- multiple_choice: ["Option A", "Option B", ...]
  fail_condition          jsonb,             -- see above
  action_required_on_fail boolean            NOT NULL DEFAULT false,
  suggested_action        text,              -- pre-populated action description on fail
  default_action_priority text               DEFAULT 'medium'
                                             CHECK (default_action_priority IN ('low','medium','high','critical')),
  order_index             integer            NOT NULL DEFAULT 0,
  is_active               boolean            NOT NULL DEFAULT true,
  created_at              timestamptz        NOT NULL DEFAULT now(),
  updated_at              timestamptz        NOT NULL DEFAULT now()
);

-- =============================================================
-- INSPECTION SCHEDULES
-- One-time or recurring assignments.
-- The scheduler advances next_due_at after each completion.
--
-- recurrence_config examples:
--   daily:   {"interval_days": 1}
--   weekly:  {"day_of_week": [1,5]}      (1=Mon, 5=Fri)
--   monthly: {"day_of_month": 1}
--   custom:  {"cron": "0 7 * * 1"}
-- =============================================================

CREATE TABLE inspection_schedules (
  id                    uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid                 NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id               uuid                 REFERENCES sites(id),
  department_id         uuid                 REFERENCES departments(id),
  work_area_id          uuid                 REFERENCES work_areas(id),
  template_id           uuid                 NOT NULL REFERENCES inspection_templates(id),
  name                  text                 NOT NULL,
  assigned_to           uuid                 REFERENCES auth.users(id), -- who should conduct it
  recurrence_type       recurrence_type_enum NOT NULL DEFAULT 'once',
  recurrence_config     jsonb,
  timezone              text                 NOT NULL DEFAULT 'UTC',
  advance_notice_days   integer              NOT NULL DEFAULT 1,         -- create inspection N days before due
  next_due_at           timestamptz,
  last_completed_at     timestamptz,
  overdue_after_hours   integer              NOT NULL DEFAULT 24,        -- how long before it's flagged overdue
  is_active             boolean              NOT NULL DEFAULT true,
  created_at            timestamptz          NOT NULL DEFAULT now(),
  updated_at            timestamptz          NOT NULL DEFAULT now(),
  created_by            uuid                 REFERENCES auth.users(id)
);

-- =============================================================
-- INSPECTIONS
-- A single conducted inspection. Created from a schedule (scheduled)
-- or ad-hoc (no schedule_id). inspection_number auto-generated.
-- template_snapshot captures the full question set as it was
-- at the time of the inspection, ensuring historical accuracy
-- even if the template is updated later.
-- =============================================================

CREATE TABLE inspections (
  id                  uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid                    NOT NULL REFERENCES organisations(id),
  site_id             uuid                    REFERENCES sites(id),
  department_id       uuid                    REFERENCES departments(id),
  work_area_id        uuid                    REFERENCES work_areas(id),
  template_id         uuid                    NOT NULL REFERENCES inspection_templates(id),
  schedule_id         uuid                    REFERENCES inspection_schedules(id) ON DELETE SET NULL,

  -- Reference
  inspection_number   text                    UNIQUE,   -- INSP-2026-00001
  template_version    integer,                          -- snapshot of template.version at start

  -- Classification
  inspection_type_id  uuid                    NOT NULL REFERENCES inspection_types(id),

  -- Conductor
  conducted_by        uuid                    REFERENCES auth.users(id),
  conducted_by_name   text,               -- denormalised; for contractor/visitor conductors
  started_at          timestamptz,
  completed_at        timestamptz,
  submitted_at        timestamptz,
  submitted_by        uuid                    REFERENCES auth.users(id),

  -- Status
  status              inspection_status_enum  NOT NULL DEFAULT 'scheduled',
  result              inspection_result_enum,

  -- Scoring
  score               decimal(5,2),             -- 0.00 – 100.00; computed by trigger
  total_questions     integer NOT NULL DEFAULT 0,
  required_questions  integer NOT NULL DEFAULT 0,
  answered_questions  integer NOT NULL DEFAULT 0,
  failed_questions    integer NOT NULL DEFAULT 0,

  -- Flags
  is_overdue          boolean NOT NULL DEFAULT false,
  has_open_actions    boolean NOT NULL DEFAULT false,

  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- INSPECTION RESPONSES
-- One row per question per inspection.
-- is_failed is computed BEFORE INSERT/UPDATE by trigger
-- based on response_value vs question.fail_condition.
-- =============================================================

CREATE TABLE inspection_responses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     uuid        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  question_id       uuid        NOT NULL REFERENCES inspection_template_questions(id),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),

  -- The answer (one of these is populated depending on question_type)
  response_value    text,       -- pass_fail, yes_no, multiple_choice, signature storage path
  response_numeric  decimal,    -- numeric questions
  response_date     timestamptz,-- date_time questions

  notes             text,       -- optional notes / explanation
  is_failed         boolean     NOT NULL DEFAULT false,   -- computed by trigger
  is_na             boolean     NOT NULL DEFAULT false,   -- respondent marked Not Applicable
  action_created    boolean     NOT NULL DEFAULT false,   -- true once a CAPA is linked

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id),
  UNIQUE (inspection_id, question_id)
);

-- =============================================================
-- INSPECTION RESPONSE EVIDENCE
-- Photos and files attached to individual responses
-- (e.g. a photo of a failed item).
-- =============================================================

CREATE TABLE inspection_response_evidence (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   uuid        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  response_id     uuid        NOT NULL REFERENCES inspection_responses(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  storage_path    text        NOT NULL,
  file_name       text        NOT NULL,
  file_size       bigint,
  mime_type       text,
  description     text,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  uploaded_by     uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- INSPECTION ACTIONS
-- Links a failed inspection response to a CAPA action (Module 5).
-- Created by create_inspection_action() when the user completes
-- the failed-item dialog.
-- =============================================================

CREATE TABLE inspection_actions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    uuid        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  response_id      uuid        NOT NULL REFERENCES inspection_responses(id) ON DELETE CASCADE,
  action_id        uuid        NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  issue_description text,      -- what the inspector described as the issue
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id),
  UNIQUE (response_id, action_id)
);

-- =============================================================
-- INDEXES
-- =============================================================

-- inspection_templates
CREATE INDEX idx_it2_org_type     ON inspection_templates(organisation_id, inspection_type_id);
CREATE INDEX idx_it2_published    ON inspection_templates(organisation_id, is_published) WHERE is_published = true;

-- inspection_template_sections
CREATE INDEX idx_its_template_id  ON inspection_template_sections(template_id, order_index);

-- inspection_template_questions
CREATE INDEX idx_itq_template_id  ON inspection_template_questions(template_id, order_index);
CREATE INDEX idx_itq_section_id   ON inspection_template_questions(section_id);
CREATE INDEX idx_itq_active       ON inspection_template_questions(template_id, is_active);

-- inspection_schedules
CREATE INDEX idx_isch_org_id      ON inspection_schedules(organisation_id);
CREATE INDEX idx_isch_assigned    ON inspection_schedules(assigned_to);
CREATE INDEX idx_isch_next_due    ON inspection_schedules(next_due_at) WHERE is_active = true;
CREATE INDEX idx_isch_site_id     ON inspection_schedules(site_id);

-- inspections
CREATE INDEX idx_insp_org_status  ON inspections(organisation_id, status);
CREATE INDEX idx_insp_site_id     ON inspections(site_id);
CREATE INDEX idx_insp_conducted_by ON inspections(conducted_by);
CREATE INDEX idx_insp_template_id ON inspections(template_id);
CREATE INDEX idx_insp_schedule_id ON inspections(schedule_id);
CREATE INDEX idx_insp_number      ON inspections(inspection_number);
CREATE INDEX idx_insp_result      ON inspections(organisation_id, result);
CREATE INDEX idx_insp_date        ON inspections(organisation_id, completed_at DESC);

-- inspection_responses
CREATE INDEX idx_ir_inspection_id ON inspection_responses(inspection_id);
CREATE INDEX idx_ir_question_id   ON inspection_responses(question_id);
CREATE INDEX idx_ir_failed        ON inspection_responses(inspection_id, is_failed) WHERE is_failed = true;

-- inspection_response_evidence
CREATE INDEX idx_ire_response_id  ON inspection_response_evidence(response_id);
CREATE INDEX idx_ire_inspection_id ON inspection_response_evidence(inspection_id);

-- inspection_actions
CREATE INDEX idx_ia_inspection_id ON inspection_actions(inspection_id);
CREATE INDEX idx_ia_response_id   ON inspection_actions(response_id);
CREATE INDEX idx_ia_action_id     ON inspection_actions(action_id);
