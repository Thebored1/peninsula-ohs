-- =============================================================
-- MODULE 7: Risk Register — Core Schema
-- =============================================================
-- Tables (10):
--   risk_categories          — lookup: hazard categories (e.g. Chemical, Ergonomic)
--   risk_likelihood_levels   — lookup: 1–5 likelihood scale with descriptions
--   risk_consequence_levels  — lookup: 1–5 consequence scale with descriptions
--   risk_matrix_thresholds   — score bands → Low / Medium / High / Critical
--   risks                    — the risk register entry (inherent + residual scoring)
--   risk_controls            — control measures per risk (Hierarchy of Controls)
--   risk_reviews             — scheduled and completed review records
--   risk_linked_incidents    — bidirectional risk ↔ incident links
--   hazard_reports           — worker-submitted hazard reports (can promote to risk)
--   hazard_report_evidence   — photos attached to hazard reports
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE risk_status_enum AS ENUM (
  'active',
  'under_review',
  'closed',
  'superseded'
);

CREATE TYPE risk_review_status_enum AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'overdue'
);

CREATE TYPE hazard_report_status_enum AS ENUM (
  'submitted',
  'under_review',
  'promoted_to_risk',
  'actioned',
  'closed',
  'rejected'
);

-- =============================================================
-- RISK CATEGORIES
-- Kept as a table so new categories can be added at runtime.
-- =============================================================

CREATE TABLE risk_categories (
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
-- RISK LIKELIHOOD LEVELS
-- 1 (Rare) → 5 (Almost Certain)
-- =============================================================

CREATE TABLE risk_likelihood_levels (
  level_number  integer     PRIMARY KEY CHECK (level_number BETWEEN 1 AND 5),
  name          text        NOT NULL,
  description   text,       -- what this level means in practice
  is_active     boolean     NOT NULL DEFAULT true
);

-- =============================================================
-- RISK CONSEQUENCE LEVELS
-- 1 (Negligible) → 5 (Fatal)
-- =============================================================

CREATE TABLE risk_consequence_levels (
  level_number  integer     PRIMARY KEY CHECK (level_number BETWEEN 1 AND 5),
  name          text        NOT NULL,
  description   text,
  is_active     boolean     NOT NULL DEFAULT true
);

-- =============================================================
-- RISK MATRIX THRESHOLDS
-- Defines the colour-band rules for the 5×5 matrix.
-- Scores: 1–4 Low, 5–9 Medium, 10–16 High, 17–25 Critical.
-- =============================================================

CREATE TABLE risk_matrix_thresholds (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label        text        NOT NULL UNIQUE,   -- 'Low', 'Medium', 'High', 'Critical'
  min_score    integer     NOT NULL,
  max_score    integer     NOT NULL,
  colour_code  text        NOT NULL,          -- hex for UI badges
  description  text,
  sort_order   integer     NOT NULL DEFAULT 0,
  CHECK (min_score <= max_score)
);

-- =============================================================
-- RISKS
-- The core risk register entry. Scores are computed by trigger:
--   inherent_risk_score    = likelihood_score × consequence_score
--   inherent_risk_level    = looked up from risk_matrix_thresholds
--   residual_risk_score    = residual_likelihood × residual_consequence
--   residual_risk_level    = looked up from risk_matrix_thresholds
--
-- risk_number is auto-generated (RISK-YYYY-NNNNN).
-- source_type / source_id: 'standalone', 'hazard_report', 'incident'
-- =============================================================

CREATE TABLE risks (
  id                          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             uuid              NOT NULL REFERENCES organisations(id),
  site_id                     uuid              REFERENCES sites(id),
  department_id               uuid              REFERENCES departments(id),
  work_area_id                uuid              REFERENCES work_areas(id),
  category_id                 uuid              REFERENCES risk_categories(id),

  -- Reference
  risk_number                 text              UNIQUE,   -- RISK-2026-00001

  -- Description
  title                       text              NOT NULL,
  hazard_description          text              NOT NULL,
  location_activity           text,             -- where / what task the hazard is associated with
  people_at_risk              text[]            NOT NULL DEFAULT '{}',
                                                -- e.g. {'workers','contractors','visitors','public'}

  -- Inherent Risk (before controls)
  likelihood_score            integer           NOT NULL CHECK (likelihood_score BETWEEN 1 AND 5),
  consequence_score           integer           NOT NULL CHECK (consequence_score BETWEEN 1 AND 5),
  inherent_risk_score         integer           GENERATED ALWAYS AS (likelihood_score * consequence_score) STORED,
  inherent_risk_level         text,             -- computed by trigger from risk_matrix_thresholds

  -- Existing Controls (summary — full list in risk_controls table)
  existing_controls_summary   text,

  -- Residual Risk (after controls)
  residual_likelihood_score   integer           CHECK (residual_likelihood_score BETWEEN 1 AND 5),
  residual_consequence_score  integer           CHECK (residual_consequence_score BETWEEN 1 AND 5),
  residual_risk_score         integer           GENERATED ALWAYS AS (
                                                  CASE WHEN residual_likelihood_score IS NOT NULL
                                                            AND residual_consequence_score IS NOT NULL
                                                  THEN residual_likelihood_score * residual_consequence_score
                                                  ELSE NULL END
                                                ) STORED,
  residual_risk_level         text,             -- computed by trigger

  -- Ownership & Review
  owner_id                    uuid              REFERENCES auth.users(id),
  review_frequency            text              NOT NULL DEFAULT 'quarterly'
                                                CHECK (review_frequency IN ('monthly','quarterly','biannual','annually','biennial','as_required')),
  next_review_date            date,
  last_reviewed_at            timestamptz,
  last_reviewed_by            uuid              REFERENCES auth.users(id),

  -- Status & Source
  status                      risk_status_enum  NOT NULL DEFAULT 'active',
  source_type                 text              NOT NULL DEFAULT 'standalone'
                                                CHECK (source_type IN ('standalone','hazard_report','incident')),
  source_id                   uuid,             -- hazard_report.id or incident.id
  source_reference            text,             -- human-readable ref (HAZ-2026-00001)

  notes                       text,
  created_at                  timestamptz       NOT NULL DEFAULT now(),
  updated_at                  timestamptz       NOT NULL DEFAULT now(),
  created_by                  uuid              REFERENCES auth.users(id)
);

-- =============================================================
-- RISK CONTROLS
-- Individual control measures for a risk, ordered by the
-- Hierarchy of Controls (eliminate → substitute → engineer
-- → admin → PPE). Multiple controls per risk.
-- =============================================================

CREATE TABLE risk_controls (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id              uuid        NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organisation_id      uuid        NOT NULL REFERENCES organisations(id),
  control_type         text        NOT NULL
                                   CHECK (control_type IN ('eliminate','substitute','engineer','admin','ppe')),
  description          text        NOT NULL,
  is_implemented       boolean     NOT NULL DEFAULT false,
  implementation_date  date,
  assigned_to          uuid        REFERENCES auth.users(id),
  effectiveness_rating integer     CHECK (effectiveness_rating BETWEEN 1 AND 5),
  effectiveness_notes  text,
  review_date          date,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- RISK REVIEWS
-- Periodic formal reviews of a risk. On completion, the risk's
-- scores may be updated and next_review_date advanced.
-- review_number auto-generated (RREV-YYYY-NNNNN).
-- =============================================================

CREATE TABLE risk_reviews (
  id                          uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id                     uuid                    NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organisation_id             uuid                    NOT NULL REFERENCES organisations(id),
  review_number               text                    UNIQUE,    -- RREV-2026-00001
  reviewer_id                 uuid                    REFERENCES auth.users(id),
  scheduled_date              date,
  status                      risk_review_status_enum NOT NULL DEFAULT 'scheduled',

  -- Scores at time of review
  prev_likelihood             integer,
  prev_consequence            integer,
  prev_residual_likelihood    integer,
  prev_residual_consequence   integer,

  -- Updated scores after review (null if unchanged)
  new_likelihood              integer                 CHECK (new_likelihood BETWEEN 1 AND 5),
  new_consequence             integer                 CHECK (new_consequence BETWEEN 1 AND 5),
  new_residual_likelihood     integer                 CHECK (new_residual_likelihood BETWEEN 1 AND 5),
  new_residual_consequence    integer                 CHECK (new_residual_consequence BETWEEN 1 AND 5),

  review_notes                text,
  outcome                     text
                              CHECK (outcome IN ('unchanged','risk_increased','risk_decreased','controls_updated','closed')),
  completed_at                timestamptz,
  completed_by                uuid                    REFERENCES auth.users(id),
  created_at                  timestamptz             NOT NULL DEFAULT now(),
  updated_at                  timestamptz             NOT NULL DEFAULT now(),
  created_by                  uuid                    REFERENCES auth.users(id)
);

-- =============================================================
-- RISK LINKED INCIDENTS
-- Bidirectional links: an incident can expose a previously
-- unidentified risk; a risk can be linked to related incidents.
-- =============================================================

CREATE TABLE risk_linked_incidents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id         uuid        NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  incident_id     uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  link_type       text        NOT NULL DEFAULT 'related'
                              CHECK (link_type IN ('caused_by','could_cause','related')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (risk_id, incident_id)
);

-- =============================================================
-- HAZARD REPORTS
-- Informal hazard submissions by workers. Can be promoted to
-- a formal risk register entry via promote_hazard_to_risk().
-- report_number auto-generated (HAZ-YYYY-NNNNN).
-- =============================================================

CREATE TABLE hazard_reports (
  id                   uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid                      NOT NULL REFERENCES organisations(id),
  site_id              uuid                      REFERENCES sites(id),
  department_id        uuid                      REFERENCES departments(id),
  work_area_id         uuid                      REFERENCES work_areas(id),

  report_number        text                      UNIQUE,     -- HAZ-2026-00001
  title                text                      NOT NULL,
  description          text                      NOT NULL,
  location_details     text,
  severity_perception  text                      NOT NULL DEFAULT 'medium'
                                                 CHECK (severity_perception IN ('low','medium','high')),

  reported_by          uuid                      NOT NULL REFERENCES auth.users(id),
  reported_at          timestamptz               NOT NULL DEFAULT now(),

  status               hazard_report_status_enum NOT NULL DEFAULT 'submitted',
  reviewed_by          uuid                      REFERENCES auth.users(id),
  reviewed_at          timestamptz,
  review_notes         text,
  action_taken         text,
  promoted_to_risk_id  uuid                      REFERENCES risks(id) ON DELETE SET NULL,

  created_at           timestamptz               NOT NULL DEFAULT now(),
  updated_at           timestamptz               NOT NULL DEFAULT now()
);

-- =============================================================
-- HAZARD REPORT EVIDENCE
-- =============================================================

CREATE TABLE hazard_report_evidence (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid        NOT NULL REFERENCES hazard_reports(id) ON DELETE CASCADE,
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
-- INDEXES
-- =============================================================

-- risks
CREATE INDEX idx_risk_org_status      ON risks(organisation_id, status);
CREATE INDEX idx_risk_site_id         ON risks(site_id);
CREATE INDEX idx_risk_owner           ON risks(owner_id);
CREATE INDEX idx_risk_number          ON risks(risk_number);
CREATE INDEX idx_risk_inherent_score  ON risks(organisation_id, inherent_risk_score DESC);
CREATE INDEX idx_risk_residual_score  ON risks(organisation_id, residual_risk_score DESC);
CREATE INDEX idx_risk_review_date     ON risks(next_review_date) WHERE status = 'active';
CREATE INDEX idx_risk_source          ON risks(source_type, source_id);
CREATE INDEX idx_risk_category        ON risks(category_id);

-- risk_controls
CREATE INDEX idx_rc_risk_id           ON risk_controls(risk_id);
CREATE INDEX idx_rc_assigned_to       ON risk_controls(assigned_to);
CREATE INDEX idx_rc_control_type      ON risk_controls(risk_id, control_type);

-- risk_reviews
CREATE INDEX idx_rr_risk_id           ON risk_reviews(risk_id);
CREATE INDEX idx_rr_reviewer          ON risk_reviews(reviewer_id);
CREATE INDEX idx_rr_scheduled         ON risk_reviews(scheduled_date) WHERE status IN ('scheduled','overdue');
CREATE INDEX idx_rr_status            ON risk_reviews(organisation_id, status);

-- risk_linked_incidents
CREATE INDEX idx_rli_risk_id          ON risk_linked_incidents(risk_id);
CREATE INDEX idx_rli_incident_id      ON risk_linked_incidents(incident_id);

-- hazard_reports
CREATE INDEX idx_hr_org_status        ON hazard_reports(organisation_id, status);
CREATE INDEX idx_hr_site_id           ON hazard_reports(site_id);
CREATE INDEX idx_hr_reported_by       ON hazard_reports(reported_by);
CREATE INDEX idx_hr_number            ON hazard_reports(report_number);

-- hazard_report_evidence
CREATE INDEX idx_hre_report_id        ON hazard_report_evidence(report_id);
