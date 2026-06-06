-- =============================================================
-- MODULE 5: Corrective & Preventive Actions (CAPA) — Core Schema
-- =============================================================
-- Design note:
--   Module 4 introduced incident_capa for the investigation
--   sub-workflow (tightly coupled to investigation records).
--   This module introduces the unified `actions` table — the
--   canonical store for ALL CAPA work across the platform:
--   incident-sourced, audit-sourced, inspection-sourced, risk-
--   sourced, and standalone. Module 4's incident_capa rows are
--   linked here via the action_id FK added at the bottom.
--
-- Tables (5 + 1 ALTER):
--   actions            — the unified CAPA record
--   action_comments    — user notes + system-auto status log
--   action_evidence    — completion proof (photos, documents)
--   action_extensions  — extension request / approve / reject workflow
--   action_assignments — full reassignment history
--   ALTER incident_capa ADD COLUMN action_id → actions(id)
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

-- Four action types per spec (corrective + preventive already exist
-- conceptually in Module 4; immediate + long_term are new here).
CREATE TYPE action_type_enum AS ENUM (
  'corrective',  -- fix what went wrong (reactive)
  'preventive',  -- stop it happening again (proactive)
  'immediate',   -- stop the hazard right now
  'long_term'    -- systemic change requiring sustained effort
);

-- Richer status set than Module 4's capa_status_enum:
-- adds verification_pending (explicit gate), reopened, cancelled.
CREATE TYPE action_status_enum AS ENUM (
  'open',
  'in_progress',
  'completed',           -- assignee says done; awaits verification
  'verification_pending',-- sent to verifier
  'verified',            -- verifier accepted
  'closed',              -- verified + formally closed
  'overdue',             -- past due_date with no completion
  'reopened',            -- verification rejected; assignee must redo
  'cancelled'
);

CREATE TYPE extension_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- =============================================================
-- ACTIONS — the unified CAPA table
--
-- source_type / source_id form a polymorphic relation:
--   source_type  = 'incident'    → source_id → incidents.id
--   source_type  = 'audit'       → source_id → (future audits.id)
--   source_type  = 'inspection'  → source_id → (future inspections.id)
--   source_type  = 'risk'        → source_id → (future risks.id)
--   source_type  = 'standalone'  → source_id IS NULL
-- No FK constraint on source_id — modules are added incrementally.
--
-- action_number is auto-generated BEFORE INSERT: ACT-YYYY-NNNNN
-- =============================================================

CREATE TABLE actions (
  id                        uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id           uuid                NOT NULL REFERENCES organisations(id),
  site_id                   uuid                REFERENCES sites(id),
  department_id             uuid                REFERENCES departments(id),

  -- Reference
  action_number             text                UNIQUE,            -- ACT-2026-00001

  -- Classification
  action_type               action_type_enum    NOT NULL,
  priority                  text                NOT NULL DEFAULT 'medium'
                                                CHECK (priority IN ('low','medium','high','critical')),

  -- Source linkage (polymorphic; no FK — source table may not exist yet)
  source_type               text                DEFAULT 'standalone',
  source_id                 uuid,               -- FK to source table's PK
  source_reference          text,               -- human-readable ref (e.g. INC-2026-00001)

  -- Content
  title                     text                NOT NULL,
  description               text                NOT NULL,

  -- Assignment
  assigned_to               uuid                REFERENCES auth.users(id),
  assigned_by               uuid                REFERENCES auth.users(id),
  assigned_at               timestamptz,

  -- Schedule
  due_date                  date,
  extended_due_date         date,               -- set when an extension is approved

  -- Verification gate
  verification_required     boolean             NOT NULL DEFAULT false,
  verification_assigned_to  uuid                REFERENCES auth.users(id),

  -- Status workflow
  status                    action_status_enum  NOT NULL DEFAULT 'open',

  -- Completion
  completion_notes          text,
  completed_at              timestamptz,
  completed_by              uuid                REFERENCES auth.users(id),

  -- Verification outcome
  verified_at               timestamptz,
  verified_by               uuid                REFERENCES auth.users(id),
  verification_notes        text,
  rejection_reason          text,               -- populated when verifier rejects

  -- Bulk close metadata
  is_bulk_closed            boolean             NOT NULL DEFAULT false,
  bulk_close_note           text,

  created_at                timestamptz         NOT NULL DEFAULT now(),
  updated_at                timestamptz         NOT NULL DEFAULT now(),
  created_by                uuid                REFERENCES auth.users(id)
);

-- =============================================================
-- ACTION COMMENTS
-- Covers both user-written updates and system-generated
-- audit entries (status changes, reassignments, etc.).
-- =============================================================

CREATE TABLE action_comments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     uuid        NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  organisation_id uuid      NOT NULL REFERENCES organisations(id),
  user_id       uuid        REFERENCES auth.users(id),
  comment_type  text        NOT NULL DEFAULT 'note'
                            CHECK (comment_type IN (
                              'note',
                              'update',
                              'status_change',
                              'reassignment',
                              'extension_request',
                              'extension_response',
                              'verification_request',
                              'rejection',
                              'system'
                            )),
  body          text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Comments are immutable once written
CREATE RULE no_update_action_comments AS ON UPDATE TO action_comments DO INSTEAD NOTHING;
CREATE RULE no_delete_action_comments AS ON DELETE TO action_comments DO INSTEAD NOTHING;

-- =============================================================
-- ACTION EVIDENCE
-- Files proving the action was completed.
-- Actual files stored in Supabase Storage.
-- =============================================================

CREATE TABLE action_evidence (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id       uuid        NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  evidence_type   text        NOT NULL
                              CHECK (evidence_type IN ('photo','video','document','other')),
  storage_path    text        NOT NULL,
  file_name       text        NOT NULL,
  file_size       bigint,
  mime_type       text,
  description     text,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  uploaded_by     uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- ACTION EXTENSIONS
-- The assignee requests a new due date.
-- A supervisor or HSE Officer approves or rejects it.
-- On approval, actions.extended_due_date is updated by trigger.
-- =============================================================

CREATE TABLE action_extensions (
  id                    uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id             uuid                   NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  organisation_id       uuid                   NOT NULL REFERENCES organisations(id),
  requested_by          uuid                   NOT NULL REFERENCES auth.users(id),
  requested_at          timestamptz            NOT NULL DEFAULT now(),
  requested_new_due_date date                  NOT NULL,
  reason                text                   NOT NULL,
  status                extension_status_enum  NOT NULL DEFAULT 'pending',
  reviewed_by           uuid                   REFERENCES auth.users(id),
  reviewed_at           timestamptz,
  review_notes          text,
  created_at            timestamptz            NOT NULL DEFAULT now()
);

-- =============================================================
-- ACTION ASSIGNMENTS
-- Full log of every reassignment (who, when, why).
-- Separate from action_comments so it can be queried efficiently
-- for the "reassignment history" UI.
-- =============================================================

CREATE TABLE action_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id       uuid        NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  assigned_from   uuid        REFERENCES auth.users(id),  -- NULL on initial assignment
  assigned_to     uuid        NOT NULL REFERENCES auth.users(id),
  assigned_by     uuid        REFERENCES auth.users(id),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  notes           text
);

CREATE RULE no_update_action_assignments AS ON UPDATE TO action_assignments DO INSTEAD NOTHING;
CREATE RULE no_delete_action_assignments AS ON DELETE TO action_assignments DO INSTEAD NOTHING;

-- =============================================================
-- LINK Module 4's incident_capa to this unified table
-- Optional: existing rows leave action_id NULL.
-- New incident CAPAs created from Module 5 onwards will have a
-- corresponding actions row and this FK filled in.
-- =============================================================

ALTER TABLE incident_capa
  ADD COLUMN action_id uuid REFERENCES actions(id) ON DELETE SET NULL;

-- =============================================================
-- INDEXES
-- =============================================================

-- actions
CREATE INDEX idx_act_org_status      ON actions(organisation_id, status);
CREATE INDEX idx_act_assigned_to     ON actions(assigned_to) WHERE status NOT IN ('verified','closed','cancelled');
CREATE INDEX idx_act_site_id         ON actions(site_id);
CREATE INDEX idx_act_source          ON actions(source_type, source_id);
CREATE INDEX idx_act_due_date        ON actions(due_date) WHERE status NOT IN ('verified','closed','cancelled');
CREATE INDEX idx_act_overdue         ON actions(organisation_id, due_date)
                                     WHERE status IN ('open','in_progress','overdue');
CREATE INDEX idx_act_number          ON actions(action_number);
CREATE INDEX idx_act_priority        ON actions(organisation_id, priority, status);
CREATE INDEX idx_act_created_at      ON actions(organisation_id, created_at DESC);

-- action_comments
CREATE INDEX idx_ac_action_id        ON action_comments(action_id, created_at DESC);

-- action_evidence
CREATE INDEX idx_aev_action_id       ON action_evidence(action_id);

-- action_extensions
CREATE INDEX idx_aex_action_id       ON action_extensions(action_id);
CREATE INDEX idx_aex_pending         ON action_extensions(organisation_id, status) WHERE status = 'pending';

-- action_assignments
CREATE INDEX idx_aas_action_id       ON action_assignments(action_id, assigned_at DESC);
CREATE INDEX idx_aas_assigned_to     ON action_assignments(assigned_to);
