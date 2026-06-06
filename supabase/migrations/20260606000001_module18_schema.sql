-- =============================================================
-- MODULE 18: JSA/JHA Builder (Job Safety Analysis) — Schema
-- =============================================================
-- Design principles:
--   • A JSA is a structured document with ordered steps.
--   • Each step has one or more hazards identified.
--   • Each hazard has one or more controls (hierarchy of controls).
--   • Risk scores (likelihood × consequence) are stored raw so the
--     UI can compute risk ratings and colour-code without recomputing.
--   • Workers who participated are tracked with optional signatures.
--   • Revision number increments when a draft is re-opened after
--     approval, allowing version history via separate audit trail.
--
-- Tables (5):
--   jsas                — parent JSA/JHA document
--   jsa_steps           — ordered job steps
--   jsa_step_hazards    — hazards identified per step
--   jsa_step_controls   — controls for each hazard
--   jsa_workers         — workers briefed / signed on the JSA
-- =============================================================

-- =============================================================
-- JSAS — parent document
-- =============================================================

CREATE TABLE IF NOT EXISTS jsas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  jsa_number        TEXT,
  title             TEXT        NOT NULL,
  job_description   TEXT,
  location          TEXT,
  site_id           UUID        REFERENCES sites(id),
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','under_review','approved','archived')),
  revision_number   INT         NOT NULL DEFAULT 1,
  valid_from        DATE,
  valid_until       DATE,
  prepared_by       UUID        REFERENCES user_profiles(id),
  reviewed_by       UUID        REFERENCES user_profiles(id),
  approved_by       UUID        REFERENCES user_profiles(id),
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID        REFERENCES user_profiles(id)
);

-- =============================================================
-- JSA STEPS — ordered list of job tasks / steps
-- =============================================================

CREATE TABLE IF NOT EXISTS jsa_steps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  jsa_id      UUID        NOT NULL REFERENCES jsas(id) ON DELETE CASCADE,
  step_number INT         NOT NULL,
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- JSA STEP HAZARDS — hazards identified for each step
-- likelihood / consequence: 1 (low) to 5 (extreme)
-- =============================================================

CREATE TABLE IF NOT EXISTS jsa_step_hazards (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id             UUID        NOT NULL REFERENCES jsa_steps(id) ON DELETE CASCADE,
  hazard_description  TEXT        NOT NULL,
  hazard_type         TEXT,
  likelihood          INT         CHECK (likelihood BETWEEN 1 AND 5),
  consequence         INT         CHECK (consequence BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- JSA STEP CONTROLS — hierarchy of controls per hazard
-- control_hierarchy: elimination / substitution / engineering /
--                    administrative / ppe
-- residual_likelihood / residual_consequence: risk after controls
-- =============================================================

CREATE TABLE IF NOT EXISTS jsa_step_controls (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id             UUID        NOT NULL REFERENCES jsa_step_hazards(id) ON DELETE CASCADE,
  control_description   TEXT        NOT NULL,
  control_hierarchy     TEXT,
  responsible_person    TEXT,
  residual_likelihood   INT         CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_consequence  INT         CHECK (residual_consequence BETWEEN 1 AND 5),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- JSA WORKERS — workers briefed on the JSA and optional signatures
-- =============================================================

CREATE TABLE IF NOT EXISTS jsa_workers (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  jsa_id              UUID        NOT NULL REFERENCES jsas(id) ON DELETE CASCADE,
  worker_name         TEXT        NOT NULL,
  worker_id           UUID        REFERENCES user_profiles(id),
  signature_obtained  BOOLEAN     DEFAULT false,
  signed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_jsas_org_status   ON jsas(organisation_id, status);
CREATE INDEX idx_jsas_org_created  ON jsas(organisation_id, created_at DESC);
CREATE INDEX idx_jsa_steps_jsa     ON jsa_steps(jsa_id, step_number);
CREATE INDEX idx_jsa_hazards_step  ON jsa_step_hazards(step_id);
CREATE INDEX idx_jsa_controls_haz  ON jsa_step_controls(hazard_id);
CREATE INDEX idx_jsa_workers_jsa   ON jsa_workers(jsa_id);
