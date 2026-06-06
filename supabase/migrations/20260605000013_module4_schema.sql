-- =============================================================
-- MODULE 4: Incident Management — Core Schema
-- =============================================================
-- Tables (15):
--   reference_counters        — generic org-scoped sequential numbering
--   incident_types            — lookup: 6 incident categories (table per spec)
--   severity_levels           — lookup: 4 severity grades with business rules
--   incidents                 — primary incident record
--   incident_people_involved  — employees, contractors, visitors involved
--   incident_witnesses        — witness contact details and statements
--   incident_evidence         — photo / video / document file metadata
--   incident_medical          — injury/illness detail (triggered by was_injury_involved)
--   incident_status_history   — append-only status transition log
--   investigations            — investigation workspace per incident
--   rca_five_whys             — structured 5-Whys RCA record
--   rca_fishbone              — Fishbone / Ishikawa header
--   rca_fishbone_causes       — individual causes across the 6 fishbone categories
--   incident_capa             — Corrective and Preventive Actions
--   regulatory_submissions    — regulatory body notification / report records
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE incident_status_enum AS ENUM (
  'draft',              -- saved but not yet submitted
  'submitted',          -- submitted by worker; awaiting triage
  'triaged',            -- severity set; investigator being assigned
  'under_investigation',
  'capa_in_progress',
  'pending_approval',   -- investigation complete; awaiting HSE/Admin sign-off
  'closed',
  'cancelled'
);

CREATE TYPE investigation_status_enum AS ENUM (
  'assigned',
  'in_progress',
  'rca_complete',
  'capa_in_progress',
  'pending_review',
  'complete'
);

CREATE TYPE capa_status_enum AS ENUM (
  'open',
  'in_progress',
  'pending_verification',
  'verified',
  'closed',
  'overdue'
);

CREATE TYPE regulatory_status_enum AS ENUM (
  'pending',
  'submitted',
  'acknowledged',
  'under_review',
  'closed'
);

-- =============================================================
-- REFERENCE COUNTERS
-- Generic org-scoped sequential numbering that resets each year.
-- Used by: incidents (INC), CAPA (CAPA), investigations (INV).
-- =============================================================

CREATE TABLE reference_counters (
  entity_type     text NOT NULL,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_number     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_type, organisation_id, year)
);

-- =============================================================
-- INCIDENT TYPES
-- Kept as a table so new types can be added without migrations.
-- =============================================================

CREATE TABLE incident_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,        -- 'injury', 'near_miss', etc.
  name          text        NOT NULL,
  description   text,
  icon          text,                               -- icon identifier for frontend
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- SEVERITY LEVELS
-- Drives notification recipients, investigation depth,
-- and regulatory reporting requirements.
-- =============================================================

CREATE TABLE severity_levels (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number                    integer     NOT NULL UNIQUE CHECK (level_number BETWEEN 1 AND 4),
  name                            text        NOT NULL,
  description                     text,
  colour_code                     text        NOT NULL DEFAULT '#gray', -- hex for UI badge
  investigation_required          boolean     NOT NULL DEFAULT false,
  regulatory_reporting_required   boolean     NOT NULL DEFAULT false,
  response_required_within_hours  integer,    -- SLA: action required within N hours
  notify_executive                boolean     NOT NULL DEFAULT false,
  is_active                       boolean     NOT NULL DEFAULT true,
  created_at                      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INCIDENTS
-- The primary incident record. incident_number is auto-generated
-- by the BEFORE INSERT trigger (INC-YYYY-NNNNN, org-scoped).
-- =============================================================

CREATE TABLE incidents (
  id                      uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid                  NOT NULL REFERENCES organisations(id),
  site_id                 uuid                  NOT NULL REFERENCES sites(id),
  department_id           uuid                  REFERENCES departments(id),
  work_area_id            uuid                  REFERENCES work_areas(id),

  -- Reference & Classification
  incident_number         text                  UNIQUE,             -- INC-2026-00001
  incident_type_id        uuid                  NOT NULL REFERENCES incident_types(id),
  severity_level_id       uuid                  REFERENCES severity_levels(id),

  -- What Happened
  title                   text                  NOT NULL,
  description             text                  NOT NULL,
  incident_date           date                  NOT NULL,
  incident_time           time,
  exact_location          text,                 -- free-text within the work area
  geo_coordinates         jsonb,                -- {lat, lng}
  immediate_actions_taken text,
  was_injury_involved     boolean               NOT NULL DEFAULT false,

  -- Status Workflow
  status                  incident_status_enum  NOT NULL DEFAULT 'draft',
  assigned_to             uuid                  REFERENCES auth.users(id),
  assigned_at             timestamptz,

  -- Submission
  submitted_by            uuid                  REFERENCES auth.users(id),
  submitted_at            timestamptz,

  -- Triage
  triaged_by              uuid                  REFERENCES auth.users(id),
  triaged_at              timestamptz,
  triage_notes            text,

  -- Regulatory flags
  regulatory_reportable   boolean               NOT NULL DEFAULT false,
  regulatory_submitted    boolean               NOT NULL DEFAULT false,
  regulatory_due_date     date,

  -- Closure
  closed_by               uuid                  REFERENCES auth.users(id),
  closed_at               timestamptz,
  closure_notes           text,

  created_at              timestamptz           NOT NULL DEFAULT now(),
  updated_at              timestamptz           NOT NULL DEFAULT now(),
  created_by              uuid                  REFERENCES auth.users(id)
);

-- =============================================================
-- INCIDENT PEOPLE INVOLVED
-- Everyone present or involved — employees, contractors, visitors.
-- user_id is nullable: contractors/visitors may not have a platform
-- account.
-- =============================================================

CREATE TABLE incident_people_involved (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  person_type       text        NOT NULL
                                CHECK (person_type IN ('employee','contractor','visitor','member_of_public')),
  user_id           uuid        REFERENCES auth.users(id),       -- NULL for external parties
  full_name         text        NOT NULL,
  job_title         text,
  employer          text,                                        -- for contractors
  contact_details   jsonb,                                       -- {phone, email, address}
  was_injured       boolean     NOT NULL DEFAULT false,
  injury_description text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- INCIDENT WITNESSES
-- Contact details and formal witness statements.
-- =============================================================

CREATE TABLE incident_witnesses (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id          uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id      uuid        NOT NULL REFERENCES organisations(id),
  user_id              uuid        REFERENCES auth.users(id),
  full_name            text        NOT NULL,
  contact_details      jsonb,
  statement            text,
  statement_date       date,
  statement_taken_by   uuid        REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INCIDENT EVIDENCE
-- Metadata for all attached files. Actual files in Supabase Storage.
-- =============================================================

CREATE TABLE incident_evidence (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  evidence_type   text        NOT NULL
                              CHECK (evidence_type IN ('photo','video','document','audio','other')),
  storage_path    text        NOT NULL,   -- Supabase Storage object path
  file_name       text        NOT NULL,
  file_size       bigint,
  mime_type       text,
  description     text,
  captured_at     timestamptz,           -- when the photo/video was taken at scene
  captured_by     uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INCIDENT MEDICAL
-- Detailed injury / illness information.
-- One row per injured person (references incident_people_involved).
-- Only created when was_injury_involved = true on the incident.
-- =============================================================

CREATE TABLE incident_medical (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id              uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id          uuid        NOT NULL REFERENCES organisations(id),
  person_involved_id       uuid        NOT NULL REFERENCES incident_people_involved(id) ON DELETE CASCADE,
  injury_type              text,       -- laceration, fracture, burn, sprain, etc.
  body_parts_affected      text[],
  treatment_provided       text,
  treated_by               text,       -- 'first_aider', 'paramedic', 'gp', 'hospital'
  hospital_name            text,
  hospital_admission       boolean     NOT NULL DEFAULT false,
  lost_time_days           integer,    -- working days lost
  return_to_work_date      date,
  restrictions_on_return   text,
  workers_comp_claim_number text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INCIDENT STATUS HISTORY
-- Append-only log of every status transition.
-- =============================================================

CREATE TABLE incident_status_history (
  id              uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid                 NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id uuid                 NOT NULL REFERENCES organisations(id),
  from_status     incident_status_enum,
  to_status       incident_status_enum NOT NULL,
  changed_by      uuid                 REFERENCES auth.users(id),
  changed_at      timestamptz          NOT NULL DEFAULT now(),
  notes           text
);

CREATE RULE no_update_incident_status_history
  AS ON UPDATE TO incident_status_history DO INSTEAD NOTHING;
CREATE RULE no_delete_incident_status_history
  AS ON DELETE TO incident_status_history DO INSTEAD NOTHING;

-- =============================================================
-- INVESTIGATIONS
-- One investigation workspace per incident.
-- investigation_number is auto-generated (INV-YYYY-NNNNN).
-- =============================================================

CREATE TABLE investigations (
  id                      uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id             uuid                      NOT NULL UNIQUE REFERENCES incidents(id),
  organisation_id         uuid                      NOT NULL REFERENCES organisations(id),
  investigation_number    text                      UNIQUE,   -- INV-2026-00001
  investigator_id         uuid                      REFERENCES auth.users(id),
  co_investigator_ids     uuid[],                   -- additional investigators
  status                  investigation_status_enum NOT NULL DEFAULT 'assigned',
  rca_method              text
                          CHECK (rca_method IN ('five_whys','fishbone','both','none')),
  start_date              date,
  target_completion_date  date,
  actual_completion_date  date,
  background              text,   -- context and pre-investigation summary
  contributing_factors    text,   -- free-form before RCA
  investigation_summary   text,   -- final written summary
  lessons_learned         text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- RCA — FIVE WHYS
-- One per investigation. Guides investigator through structured
-- questioning to trace back to the root cause.
-- =============================================================

CREATE TABLE rca_five_whys (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id      uuid        NOT NULL UNIQUE REFERENCES investigations(id) ON DELETE CASCADE,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  problem_statement     text        NOT NULL,
  why_1                 text,
  because_1             text,
  why_2                 text,
  because_2             text,
  why_3                 text,
  because_3             text,
  why_4                 text,
  because_4             text,
  why_5                 text,
  because_5             text,
  identified_root_cause text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- RCA — FISHBONE (ISHIKAWA) HEADER
-- One per investigation. problem_statement describes the effect
-- (the problem being analysed). summary captures the identified
-- root cause after reviewing all causes.
-- =============================================================

CREATE TABLE rca_fishbone (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id      uuid        NOT NULL UNIQUE REFERENCES investigations(id) ON DELETE CASCADE,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  problem_statement     text        NOT NULL,
  identified_root_cause text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- RCA — FISHBONE CAUSES
-- Multiple causes per fishbone, distributed across the standard
-- six Ishikawa categories.
-- =============================================================

CREATE TABLE rca_fishbone_causes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fishbone_id      uuid        NOT NULL REFERENCES rca_fishbone(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  category         text        NOT NULL
                               CHECK (category IN (
                                 'people','process','equipment',
                                 'environment','management','materials'
                               )),
  cause_description text       NOT NULL,
  is_contributing  boolean     NOT NULL DEFAULT true,
  is_root_cause    boolean     NOT NULL DEFAULT false,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- CORRECTIVE AND PREVENTIVE ACTIONS (CAPA)
-- Linked to both the incident and the investigation.
-- capa_number is auto-generated (CAPA-YYYY-NNNNN).
-- =============================================================

CREATE TABLE incident_capa (
  id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         uuid            NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  investigation_id    uuid            REFERENCES investigations(id) ON DELETE SET NULL,
  organisation_id     uuid            NOT NULL REFERENCES organisations(id),
  capa_number         text            UNIQUE,  -- CAPA-2026-00001
  title               text            NOT NULL,
  description         text            NOT NULL,
  capa_type           text            NOT NULL
                                      CHECK (capa_type IN ('corrective','preventive')),
  priority            text            NOT NULL DEFAULT 'medium'
                                      CHECK (priority IN ('low','medium','high','critical')),
  assigned_to         uuid            REFERENCES auth.users(id),
  assigned_by         uuid            REFERENCES auth.users(id),
  assigned_at         timestamptz,
  due_date            date,
  status              capa_status_enum NOT NULL DEFAULT 'open',
  completion_notes    text,
  completed_at        timestamptz,
  completed_by        uuid            REFERENCES auth.users(id),
  verified_by         uuid            REFERENCES auth.users(id),
  verified_at         timestamptz,
  verification_notes  text,
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now(),
  created_by          uuid            REFERENCES auth.users(id)
);

-- =============================================================
-- REGULATORY SUBMISSIONS
-- Tracks regulatory body notifications and formal report
-- submissions per incident.
-- =============================================================

CREATE TABLE regulatory_submissions (
  id               uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id      uuid                   NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id  uuid                   NOT NULL REFERENCES organisations(id),
  regulatory_body  text                   NOT NULL, -- 'WorkSafe', 'EPA', 'SafeWork', etc.
  submission_type  text                   NOT NULL
                                          CHECK (submission_type IN ('notification','full_report','update')),
  required_by_date date,
  submitted_date   date,
  submitted_by     uuid                   REFERENCES auth.users(id),
  reference_number text,                  -- regulator's own reference ID
  status           regulatory_status_enum NOT NULL DEFAULT 'pending',
  submission_data  jsonb,                 -- structured fields required by the regulator
  notes            text,
  created_at       timestamptz            NOT NULL DEFAULT now(),
  updated_at       timestamptz            NOT NULL DEFAULT now(),
  created_by       uuid                   REFERENCES auth.users(id)
);

-- =============================================================
-- INDEXES
-- =============================================================

-- incidents
CREATE INDEX idx_inc_org_status     ON incidents(organisation_id, status);
CREATE INDEX idx_inc_site_id        ON incidents(site_id);
CREATE INDEX idx_inc_type_id        ON incidents(incident_type_id);
CREATE INDEX idx_inc_severity       ON incidents(severity_level_id);
CREATE INDEX idx_inc_submitted_by   ON incidents(submitted_by);
CREATE INDEX idx_inc_assigned_to    ON incidents(assigned_to);
CREATE INDEX idx_inc_date           ON incidents(incident_date DESC);
CREATE INDEX idx_inc_number         ON incidents(incident_number);
CREATE INDEX idx_inc_org_date       ON incidents(organisation_id, incident_date DESC);

-- incident_people_involved
CREATE INDEX idx_ipi_incident_id    ON incident_people_involved(incident_id);
CREATE INDEX idx_ipi_user_id        ON incident_people_involved(user_id);

-- incident_witnesses
CREATE INDEX idx_iw_incident_id     ON incident_witnesses(incident_id);

-- incident_evidence
CREATE INDEX idx_ie_incident_id     ON incident_evidence(incident_id);
CREATE INDEX idx_ie_type            ON incident_evidence(incident_id, evidence_type);

-- incident_medical
CREATE INDEX idx_im_incident_id     ON incident_medical(incident_id);

-- incident_status_history
CREATE INDEX idx_ish_incident_id    ON incident_status_history(incident_id);
CREATE INDEX idx_ish_changed_at     ON incident_status_history(incident_id, changed_at DESC);

-- investigations
CREATE INDEX idx_inv_incident_id    ON investigations(incident_id);
CREATE INDEX idx_inv_investigator   ON investigations(investigator_id);
CREATE INDEX idx_inv_status         ON investigations(status);

-- rca_fishbone_causes
CREATE INDEX idx_rfc_fishbone_id    ON rca_fishbone_causes(fishbone_id);
CREATE INDEX idx_rfc_category       ON rca_fishbone_causes(fishbone_id, category);

-- incident_capa
CREATE INDEX idx_capa_incident_id   ON incident_capa(incident_id);
CREATE INDEX idx_capa_assigned_to   ON incident_capa(assigned_to);
CREATE INDEX idx_capa_status        ON incident_capa(organisation_id, status);
CREATE INDEX idx_capa_due_date      ON incident_capa(due_date) WHERE status NOT IN ('verified','closed');

-- regulatory_submissions
CREATE INDEX idx_rs_incident_id     ON regulatory_submissions(incident_id);
CREATE INDEX idx_rs_status          ON regulatory_submissions(organisation_id, status);
CREATE INDEX idx_rs_due_date        ON regulatory_submissions(required_by_date) WHERE status = 'pending';
