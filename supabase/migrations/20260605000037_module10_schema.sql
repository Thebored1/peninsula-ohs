-- =============================================================
-- MODULE 10: Document Management Enhancement — Schema
-- =============================================================
-- Module 1 provides the base documents + document_versions tables.
-- This module ADDS:
--   1. Proper lookup tables for document types/statuses/categories
--   2. Multi-step review/approval workflow infrastructure
--   3. Worker acknowledgement tracking
--   4. Polymorphic document links to any other module
--
-- New tables (7):
--   document_types                  — lookup: SOP, SWMS, policy, SDS, etc.
--   document_statuses               — lookup: draft, in_review, approved, etc.
--   document_review_workflows       — named review/approval chain definitions
--   document_review_workflow_steps  — ordered steps within a workflow
--   document_version_reviews        — actual review decisions per version per step
--   document_acknowledgements       — completed read/sign-off records
--   document_acknowledgement_requirements — which roles/users must acknowledge
--   document_links                  — polymorphic links to other modules
--
-- ALTER documents: add structured FK columns, review/ack flags
-- ALTER document_versions: add status + rejection notes
-- =============================================================

-- =============================================================
-- DOCUMENT TYPES
-- Replaces the existing documents.document_type text column
-- with a proper FK. The text column is kept for backward
-- compatibility; new records should use document_type_id.
-- =============================================================

CREATE TABLE document_types (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  description     text,
  requires_review boolean     NOT NULL DEFAULT false,  -- mandates workflow before publish
  review_cycle_days integer,                           -- default review frequency
  icon            text,
  display_order   integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- DOCUMENT STATUSES
-- Lifecycle of a document, not hard-coded as an enum.
-- is_editable: whether the document content can be changed.
-- is_live: whether workers can view/access this version.
-- =============================================================

CREATE TABLE document_statuses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  is_editable   boolean     NOT NULL DEFAULT false,
  is_live       boolean     NOT NULL DEFAULT false,
  colour_code   text        NOT NULL DEFAULT '#6b7280',
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- DOCUMENT REVIEW WORKFLOWS
-- Defines the named chain of review/approval steps.
-- Used at the document_type level (default) or per-document.
-- =============================================================

CREATE TABLE document_review_workflows (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  name            text        NOT NULL,
  description     text,
  is_default      boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- step_type: reviewer = can comment/approve/reject; approver = final gate
CREATE TABLE document_review_workflow_steps (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid        NOT NULL REFERENCES document_review_workflows(id) ON DELETE CASCADE,
  order_index     integer     NOT NULL DEFAULT 0,
  step_name       text        NOT NULL,
  step_type       text        NOT NULL DEFAULT 'reviewer'
                              CHECK (step_type IN ('reviewer','approver','notified')),
  -- Assignee can be a specific user OR any member of a role
  assigned_user_id uuid       REFERENCES auth.users(id),
  assigned_role_id uuid       REFERENCES roles(id),
  is_required     boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- DOCUMENT VERSION REVIEWS
-- One row per version per workflow step — tracks the actual
-- review decision for each step of the approval chain.
-- =============================================================

CREATE TABLE document_version_reviews (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id       uuid        NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  workflow_step_id uuid        NOT NULL REFERENCES document_review_workflow_steps(id),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  reviewer_id      uuid        REFERENCES auth.users(id),
  decision         text        CHECK (decision IN ('pending','approved','rejected','noted')),
  decision_notes   text,
  decided_at       timestamptz,
  notified_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, workflow_step_id)
);

-- =============================================================
-- DOCUMENT ACKNOWLEDGEMENTS
-- Records that a user has read and acknowledged a document.
-- Linked to a specific version so the audit trail is exact.
-- =============================================================

CREATE TABLE document_acknowledgements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id       uuid        NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  user_id          uuid        NOT NULL REFERENCES auth.users(id),
  acknowledged_at  timestamptz NOT NULL DEFAULT now(),
  method           text        NOT NULL DEFAULT 'digital_sign'
                               CHECK (method IN ('digital_sign','checkbox','witnessed')),
  ip_address       text,       -- optional audit trail
  notes            text,
  UNIQUE (version_id, user_id)
);

-- =============================================================
-- DOCUMENT ACKNOWLEDGEMENT REQUIREMENTS
-- Defines who MUST acknowledge a document. Can be:
--   - A specific user
--   - All members of a role
--   - All members of a site
-- The application resolves these to concrete users for tracking.
-- =============================================================

CREATE TABLE document_acknowledgement_requirements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  -- Exactly one of these must be set
  required_user_id uuid        REFERENCES auth.users(id),
  required_role_id uuid        REFERENCES roles(id),
  required_site_id uuid        REFERENCES sites(id),
  deadline_days    integer,    -- days after document is published to acknowledge
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id),
  CHECK (
    (required_user_id IS NOT NULL)::int +
    (required_role_id IS NOT NULL)::int +
    (required_site_id IS NOT NULL)::int = 1
  )
);

-- =============================================================
-- DOCUMENT LINKS
-- Polymorphic links: a document can be referenced by a permit,
-- incident, chemical, asset, etc. source_type / source_id
-- follow the same convention as actions.source_type.
-- =============================================================

CREATE TABLE document_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  source_type     text        NOT NULL,  -- 'permit','incident','asset','chemical','risk', etc.
  source_id       uuid        NOT NULL,
  source_reference text,                 -- human-readable ref
  link_context    text,                  -- why it's linked (procedure, SDS, reference, etc.)
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (document_id, source_type, source_id)
);

-- =============================================================
-- ALTER documents table — add structured columns
-- =============================================================

ALTER TABLE documents
  ADD COLUMN document_type_id   uuid        REFERENCES document_types(id),
  ADD COLUMN status_id          uuid        REFERENCES document_statuses(id),
  ADD COLUMN review_workflow_id uuid        REFERENCES document_review_workflows(id),
  ADD COLUMN requires_acknowledgement boolean NOT NULL DEFAULT false,
  ADD COLUMN review_cycle_days  integer,
  ADD COLUMN review_due_date    date,
  ADD COLUMN is_controlled_document boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at       timestamptz,
  ADD COLUMN published_by       uuid        REFERENCES auth.users(id),
  ADD COLUMN superseded_by_id   uuid        REFERENCES documents(id);

-- ALTER document_versions — add review state
ALTER TABLE document_versions
  ADD COLUMN status           text        DEFAULT 'draft'
                              CHECK (status IN ('draft','in_review','approved','published','rejected','archived')),
  ADD COLUMN rejection_notes  text,
  ADD COLUMN submitted_for_review_at timestamptz,
  ADD COLUMN submitted_by     uuid        REFERENCES auth.users(id);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_dt_active           ON document_types(is_active);
CREATE INDEX idx_ds_active           ON document_statuses(is_active);
CREATE INDEX idx_drwf_org_id         ON document_review_workflows(organisation_id);
CREATE INDEX idx_drwfs_workflow_id   ON document_review_workflow_steps(workflow_id, order_index);

CREATE INDEX idx_dvr_version_id      ON document_version_reviews(version_id);
CREATE INDEX idx_dvr_reviewer_id     ON document_version_reviews(reviewer_id);
CREATE INDEX idx_dvr_pending         ON document_version_reviews(reviewer_id)
                                     WHERE decision = 'pending';

CREATE INDEX idx_dack_document_id    ON document_acknowledgements(document_id);
CREATE INDEX idx_dack_user_id        ON document_acknowledgements(user_id);
CREATE INDEX idx_dack_version_id     ON document_acknowledgements(version_id);

CREATE INDEX idx_dackreq_doc_id      ON document_acknowledgement_requirements(document_id);
CREATE INDEX idx_dackreq_role_id     ON document_acknowledgement_requirements(required_role_id);
CREATE INDEX idx_dackreq_site_id     ON document_acknowledgement_requirements(required_site_id);

CREATE INDEX idx_dlink_doc_id        ON document_links(document_id);
CREATE INDEX idx_dlink_source        ON document_links(source_type, source_id);

CREATE INDEX idx_doc_type_id         ON documents(document_type_id);
CREATE INDEX idx_doc_status_id       ON documents(status_id);
CREATE INDEX idx_doc_review_due      ON documents(review_due_date)
                                     WHERE is_active = true;
