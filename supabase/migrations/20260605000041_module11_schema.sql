-- =============================================================
-- MODULE 11: Permit to Work (PTW) — Core Schema
-- =============================================================
-- All types, statuses, and PPE categories are lookup tables.
-- Permits are time-limited; an auto-expire sweep runs daily.
--
-- New tables (13):
--   permit_types              — lookup: hot_work, confined_space, etc.
--   permit_statuses           — lookup: full lifecycle from draft to closed
--   ppe_types                 — lookup (shared reference for all modules)
--   permits                   — PTW header record (PTW-YYYY-NNNNN)
--   permit_workers            — workers involved in the permit
--   permit_hazards            — hazards identified (can link to risk register)
--   permit_control_measures   — controls applied
--   permit_ppe_requirements   — required PPE items (FK to ppe_types)
--   permit_approvals          — approval chain per permit
--   permit_conditions         — conditions attached to the permit
--   permit_isolation_certs    — electrical/mechanical isolation certificates
--   permit_asset_links        — assets being worked on
--   permit_document_links     — procedures/SWMS referenced
-- =============================================================

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

CREATE TABLE permit_types (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text        NOT NULL UNIQUE,
  name                 text        NOT NULL,
  description          text,
  rescue_plan_required boolean     NOT NULL DEFAULT false,  -- e.g. confined space
  isolation_required   boolean     NOT NULL DEFAULT false,  -- e.g. electrical
  max_duration_hours   integer,                             -- typical max time
  icon                 text,
  display_order        integer     NOT NULL DEFAULT 0,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- is_active_work: whether work is actually ongoing at this status
-- is_terminal: no further transitions allowed
CREATE TABLE permit_statuses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  description     text,
  is_active_work  boolean     NOT NULL DEFAULT false,
  is_terminal     boolean     NOT NULL DEFAULT false,
  colour_code     text        NOT NULL DEFAULT '#6b7280',
  display_order   integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Shared PPE type lookup — used by permits, inspections, incidents
CREATE TABLE ppe_types (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  description     text,
  icon            text,
  display_order   integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMITS
-- permit_number: PTW-YYYY-NNNNN
-- valid_from / valid_until: enforced time limit.
-- A permit that hits valid_until while still active is auto-expired
-- by mark_expired_permits().
-- =============================================================

CREATE TABLE permits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  site_id             uuid        REFERENCES sites(id),
  department_id       uuid        REFERENCES departments(id),
  work_area_id        uuid        REFERENCES work_areas(id),

  permit_number       text        UNIQUE,             -- PTW-2026-00001
  permit_type_id      uuid        NOT NULL REFERENCES permit_types(id),
  status_id           uuid        NOT NULL REFERENCES permit_statuses(id),

  -- Work description
  title               text        NOT NULL,
  work_description    text        NOT NULL,
  exact_location      text,

  -- Schedule
  valid_from          timestamptz,
  valid_until         timestamptz,
  actual_start        timestamptz,
  actual_end          timestamptz,

  -- Key people
  applicant_id        uuid        NOT NULL REFERENCES auth.users(id),
  responsible_person_id uuid      REFERENCES auth.users(id),   -- on-site person in charge

  -- Risk assessment link
  risk_id             uuid        REFERENCES risks(id) ON DELETE SET NULL,

  -- Emergency / rescue
  emergency_contacts  jsonb,      -- [{name, phone, role}]
  rescue_plan         text,       -- mandatory for confined space

  -- Closure
  work_completed_by   uuid        REFERENCES auth.users(id),
  work_completed_at   timestamptz,
  site_cleared_by     uuid        REFERENCES auth.users(id),
  site_cleared_at     timestamptz,
  closure_notes       text,

  -- Post-work check
  post_work_check_required boolean NOT NULL DEFAULT false,
  post_work_check_completed boolean NOT NULL DEFAULT false,
  post_work_check_by  uuid        REFERENCES auth.users(id),
  post_work_check_at  timestamptz,
  post_work_notes     text,

  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- PERMIT WORKERS
-- All people authorised to carry out work under this permit.
-- =============================================================

CREATE TABLE permit_workers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id       uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  user_id         uuid        REFERENCES auth.users(id),      -- NULL for external workers
  full_name       text        NOT NULL,
  employer        text,
  role_on_job     text,
  induction_verified boolean  NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMIT HAZARDS
-- Hazards identified during the pre-work risk assessment.
-- Can optionally link back to a risk register entry.
-- =============================================================

CREATE TABLE permit_hazards (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id        uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  risk_id          uuid        REFERENCES risks(id) ON DELETE SET NULL, -- optional link
  hazard_description text      NOT NULL,
  potential_harm   text,
  likelihood       integer     CHECK (likelihood BETWEEN 1 AND 5),
  consequence      integer     CHECK (consequence BETWEEN 1 AND 5),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- PERMIT CONTROL MEASURES
-- Controls applied against identified hazards.
-- control_type follows Hierarchy of Controls (same as risk_controls).
-- =============================================================

CREATE TABLE permit_control_measures (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id        uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  hazard_id        uuid        REFERENCES permit_hazards(id) ON DELETE SET NULL,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  control_type     text        NOT NULL DEFAULT 'admin'
                               CHECK (control_type IN ('eliminate','substitute','engineer','admin','ppe')),
  description      text        NOT NULL,
  is_verified      boolean     NOT NULL DEFAULT false,
  verified_by      uuid        REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMIT PPE REQUIREMENTS
-- Specific PPE items required for this permit.
-- =============================================================

CREATE TABLE permit_ppe_requirements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id        uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  ppe_type_id      uuid        NOT NULL REFERENCES ppe_types(id),
  specification    text,       -- e.g. 'P2 respirator', 'arc flash rated'
  is_mandatory     boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMIT APPROVALS
-- Each approval step in the permit lifecycle.
-- order_index drives the sequence; a step cannot be approved
-- until the previous step is approved (enforced at app layer).
-- =============================================================

CREATE TABLE permit_approvals (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id        uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  order_index      integer     NOT NULL DEFAULT 0,
  step_name        text        NOT NULL,  -- e.g. 'Supervisor Review', 'HSE Approval', 'Issue'
  approver_id      uuid        REFERENCES auth.users(id),
  decision         text        CHECK (decision IN ('pending','approved','rejected','delegated')),
  decision_notes   text,
  decided_at       timestamptz,
  notified_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMIT CONDITIONS
-- Specific conditions that must be met for work to proceed.
-- =============================================================

CREATE TABLE permit_conditions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id        uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  condition_text   text        NOT NULL,
  is_met           boolean     NOT NULL DEFAULT false,
  verified_by      uuid        REFERENCES auth.users(id),
  verified_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMIT ISOLATION CERTIFICATES
-- Required for electrical/mechanical isolation work.
-- Can span multiple isolation points per permit.
-- =============================================================

CREATE TABLE permit_isolation_certs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id            uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  organisation_id      uuid        NOT NULL REFERENCES organisations(id),
  cert_number          text,       -- isolation certificate reference number
  isolation_type       text        NOT NULL DEFAULT 'electrical'
                                   CHECK (isolation_type IN ('electrical','mechanical','pneumatic','hydraulic','other')),
  description          text        NOT NULL,
  isolation_points     text[],     -- list of isolation points / switchgear tags
  isolated_by          uuid        REFERENCES auth.users(id),
  isolated_at          timestamptz,
  de_isolated_by       uuid        REFERENCES auth.users(id),
  de_isolated_at       timestamptz,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- PERMIT ASSET LINKS
-- Assets being worked on under this permit.
-- =============================================================

CREATE TABLE permit_asset_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id       uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  asset_id        uuid        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (permit_id, asset_id)
);

-- =============================================================
-- PERMIT DOCUMENT LINKS
-- Procedures, SWMS, risk assessments referenced by the permit.
-- =============================================================

CREATE TABLE permit_document_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id       uuid        NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  document_id     uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  link_context    text,       -- e.g. 'SWMS', 'risk_assessment', 'procedure'
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (permit_id, document_id)
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_permits_org_status     ON permits(organisation_id, status_id);
CREATE INDEX idx_permits_site_id        ON permits(site_id);
CREATE INDEX idx_permits_applicant      ON permits(applicant_id);
CREATE INDEX idx_permits_number         ON permits(permit_number);
CREATE INDEX idx_permits_valid_until    ON permits(valid_until)
                                        WHERE valid_until IS NOT NULL;
CREATE INDEX idx_permits_active         ON permits(organisation_id, site_id, valid_from, valid_until);
CREATE INDEX idx_permits_type_id        ON permits(permit_type_id);

CREATE INDEX idx_pw_permit_id           ON permit_workers(permit_id);
CREATE INDEX idx_pw_user_id             ON permit_workers(user_id);
CREATE INDEX idx_ph_permit_id           ON permit_hazards(permit_id);
CREATE INDEX idx_pcm_permit_id          ON permit_control_measures(permit_id);
CREATE INDEX idx_pppe_permit_id         ON permit_ppe_requirements(permit_id);
CREATE INDEX idx_papproval_permit_id    ON permit_approvals(permit_id, order_index);
CREATE INDEX idx_papproval_approver     ON permit_approvals(approver_id)
                                        WHERE decision = 'pending';
CREATE INDEX idx_pcond_permit_id        ON permit_conditions(permit_id);
CREATE INDEX idx_piso_permit_id         ON permit_isolation_certs(permit_id);
CREATE INDEX idx_pal_permit_id          ON permit_asset_links(permit_id);
CREATE INDEX idx_pal_asset_id           ON permit_asset_links(asset_id);
CREATE INDEX idx_pdl_permit_id          ON permit_document_links(permit_id);
