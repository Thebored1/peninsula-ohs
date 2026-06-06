-- =============================================================
-- MODULE 9: Audit Management — Core Schema
-- =============================================================
-- Audits have a two-layer structure:
--   1. Reusable templates (audit_templates → sections → criteria)
--   2. Actual audit instances (audits → sections → criteria → findings)
-- Findings against criteria produce CAPA actions (Module 5).
-- All outcome types, audit types are lookup tables.
--
-- Tables (11):
--   audit_types              — lookup: internal, external, compliance, etc.
--   audit_finding_outcomes   — lookup: conformance, minor_nc, major_nc, observation, OFI
--   audit_templates          — reusable audit template headers
--   audit_template_sections  — sections within templates
--   audit_template_criteria  — criteria within template sections
--   audits                   — audit instance header
--   audit_sections           — sections within this audit (copied from template or ad-hoc)
--   audit_criteria           — criteria under each section
--   audit_findings           — assessment result against a criterion
--   audit_evidence           — documents/photos attached to criteria or findings
--   audit_finding_actions    — links findings to Module 5 actions
-- =============================================================

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

CREATE TABLE audit_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- requires_action: if true, a CAPA action should be created for any
-- finding with this outcome.
CREATE TABLE audit_finding_outcomes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  description     text,
  requires_action boolean     NOT NULL DEFAULT false,
  is_nonconformance boolean   NOT NULL DEFAULT false,  -- major/minor NC flags
  colour_code     text        NOT NULL DEFAULT '#6b7280',
  display_order   integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- AUDIT TEMPLATES
-- A template pre-populates sections and criteria when an audit
-- is created. Templates can target a specific type/standard.
-- =============================================================

CREATE TABLE audit_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  audit_type_id   uuid        REFERENCES audit_types(id),
  name            text        NOT NULL,
  description     text,
  standard_reference text,    -- e.g. 'ISO 45001:2018 Clause 9.2'
  version         integer     NOT NULL DEFAULT 1,
  is_published    boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

CREATE TABLE audit_template_sections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid        NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  order_index  integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_template_criteria (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid        NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  section_id        uuid        REFERENCES audit_template_sections(id) ON DELETE SET NULL,
  reference_number  text,       -- e.g. '4.1', '6.1.2'
  criterion_text    text        NOT NULL,
  guidance          text,       -- auditor guidance notes
  evidence_required text,       -- what evidence to look for
  order_index       integer     NOT NULL DEFAULT 0,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- AUDITS
-- audit_number: AUDIT-YYYY-NNNNN
-- template_id: optional — audit can be ad-hoc or template-based
-- =============================================================

CREATE TABLE audits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  audit_type_id       uuid        NOT NULL REFERENCES audit_types(id),
  template_id         uuid        REFERENCES audit_templates(id) ON DELETE SET NULL,

  audit_number        text        UNIQUE,       -- AUDIT-2026-00001
  title               text        NOT NULL,
  scope               text,                     -- what is being audited
  objectives          text,
  standard_reference  text,                     -- regulation/standard being audited against

  -- Sites covered (array, as an audit can span multiple sites)
  site_ids            uuid[]      NOT NULL DEFAULT '{}',

  -- People
  lead_auditor_id     uuid        REFERENCES auth.users(id),
  auditor_ids         uuid[]      NOT NULL DEFAULT '{}',  -- additional auditors
  auditee_ids         uuid[]      NOT NULL DEFAULT '{}',  -- people being audited

  -- Dates
  planned_start_date  date,
  planned_end_date    date,
  actual_start_date   date,
  actual_end_date     date,
  report_due_date     date,

  -- Status
  status              text        NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','in_progress','findings_review','report_draft','completed','cancelled')),

  -- Summary
  total_criteria      integer     NOT NULL DEFAULT 0,
  assessed_criteria   integer     NOT NULL DEFAULT 0,
  conformance_count   integer     NOT NULL DEFAULT 0,
  minor_nc_count      integer     NOT NULL DEFAULT 0,
  major_nc_count      integer     NOT NULL DEFAULT 0,
  observation_count   integer     NOT NULL DEFAULT 0,
  ofi_count           integer     NOT NULL DEFAULT 0,

  overall_rating      text,       -- free-text overall assessment
  executive_summary   text,
  report_storage_path text,       -- generated PDF path in Supabase Storage

  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- AUDIT SECTIONS
-- Can be copied from a template or created directly on the audit.
-- template_section_id allows tracing back to the source template.
-- =============================================================

CREATE TABLE audit_sections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id              uuid        NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  template_section_id   uuid        REFERENCES audit_template_sections(id) ON DELETE SET NULL,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  title                 text        NOT NULL,
  description           text,
  order_index           integer     NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- AUDIT CRITERIA
-- Individual requirements being assessed. One finding per criterion.
-- =============================================================

CREATE TABLE audit_criteria (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id              uuid        NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  section_id            uuid        REFERENCES audit_sections(id) ON DELETE SET NULL,
  template_criterion_id uuid        REFERENCES audit_template_criteria(id) ON DELETE SET NULL,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  reference_number      text,
  criterion_text        text        NOT NULL,
  guidance              text,
  evidence_required     text,
  order_index           integer     NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- AUDIT FINDINGS
-- One row per criterion. Stores the assessment outcome,
-- supporting notes, and links to evidence.
-- =============================================================

CREATE TABLE audit_findings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id         uuid        NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  criterion_id     uuid        NOT NULL REFERENCES audit_criteria(id) ON DELETE CASCADE,
  outcome_id       uuid        NOT NULL REFERENCES audit_finding_outcomes(id),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),

  finding_text     text,       -- description of what was found
  objective_evidence text,     -- factual evidence supporting the finding
  root_cause       text,
  recommendation   text,
  auditor_notes    text,

  -- Populated when finding is linked to an action
  action_created   boolean     NOT NULL DEFAULT false,

  assessed_by      uuid        REFERENCES auth.users(id),
  assessed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, criterion_id)   -- one finding per criterion
);

-- =============================================================
-- AUDIT EVIDENCE
-- Attached to either an audit_criterion (broad evidence)
-- or a specific audit_finding.
-- =============================================================

CREATE TABLE audit_evidence (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id         uuid        NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  criterion_id     uuid        REFERENCES audit_criteria(id) ON DELETE CASCADE,
  finding_id       uuid        REFERENCES audit_findings(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  evidence_type    text        NOT NULL DEFAULT 'document'
                               CHECK (evidence_type IN ('document','photo','interview_note','observation','record','other')),
  -- For document library links (Module 10)
  document_id      uuid        REFERENCES documents(id) ON DELETE SET NULL,
  -- For direct uploads
  storage_path     text,
  file_name        text,
  file_size        bigint,
  mime_type        text,
  description      text        NOT NULL,
  collected_at     timestamptz,
  collected_by     uuid        REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- AUDIT FINDING ACTIONS
-- Links a finding (non-conformance / OFI) to a Module 5 action.
-- =============================================================

CREATE TABLE audit_finding_actions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id      uuid        NOT NULL REFERENCES audit_findings(id) ON DELETE CASCADE,
  action_id       uuid        NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (finding_id, action_id)
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_ats_template_id     ON audit_template_sections(template_id, order_index);
CREATE INDEX idx_atc_template_id     ON audit_template_criteria(template_id, order_index);
CREATE INDEX idx_atc_section_id      ON audit_template_criteria(section_id);

CREATE INDEX idx_audit_org_status    ON audits(organisation_id, status);
CREATE INDEX idx_audit_type_id       ON audits(audit_type_id);
CREATE INDEX idx_audit_auditor       ON audits(lead_auditor_id);
CREATE INDEX idx_audit_number        ON audits(audit_number);
CREATE INDEX idx_audit_dates         ON audits(planned_start_date, planned_end_date);

CREATE INDEX idx_asec_audit_id       ON audit_sections(audit_id, order_index);
CREATE INDEX idx_acri_audit_id       ON audit_criteria(audit_id, order_index);
CREATE INDEX idx_acri_section_id     ON audit_criteria(section_id);
CREATE INDEX idx_afnd_audit_id       ON audit_findings(audit_id);
CREATE INDEX idx_afnd_outcome        ON audit_findings(outcome_id);
CREATE INDEX idx_afnd_nc             ON audit_findings(audit_id)
                                     WHERE action_created = false;
CREATE INDEX idx_aev_audit_id        ON audit_evidence(audit_id);
CREATE INDEX idx_afa_finding_id      ON audit_finding_actions(finding_id);
CREATE INDEX idx_afa_action_id       ON audit_finding_actions(action_id);
