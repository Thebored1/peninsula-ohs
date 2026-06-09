-- =============================================================
-- BACKGROUND CHECKS MODULE: Schema
-- =============================================================
-- Tables: bgc_providers, bgc_organisation_providers,
--         bgc_consent_templates, bgc_role_requirements,
--         bgc_packages, bgc_orders, bgc_consent_tokens,
--         bgc_consent_records, bgc_results, bgc_result_raw,
--         bgc_adverse_action_notices, bgc_disputes,
--         bgc_adjudications, bgc_reference_templates,
--         bgc_reference_questions, bgc_reference_requests,
--         bgc_reference_responses, bgc_reverification_schedules,
--         bgc_reverification_events, worker_licences,
--         worker_licence_alerts
-- =============================================================

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE bgc_check_type AS ENUM (
  'identity',
  'criminal_standard',
  'criminal_vulnerable_sector',
  'drivers_abstract',
  'employment_history',
  'education_credential',
  'professional_licence',
  'reference_check',
  'credit_check'
);

CREATE TYPE bgc_package_status AS ENUM (
  'draft',
  'consent_pending',
  'consent_given',
  'ordering',
  'in_progress',
  'review_pending',
  'adjudicated',
  'complete',
  'withdrawn'
);

CREATE TYPE bgc_order_status AS ENUM (
  'consent_pending',
  'ordered',
  'in_progress',
  'completed',
  'under_review',
  'adjudicated',
  'cancelled',
  'error'
);

CREATE TYPE bgc_result_summary AS ENUM (
  'clear',
  'record_found',
  'unable_to_determine',
  'refer',
  'pending'
);

CREATE TYPE bgc_recommendation AS ENUM (
  'proceed',
  'proceed_with_conditions',
  'do_not_proceed'
);

CREATE TYPE bgc_requirement_level AS ENUM (
  'required',
  'optional',
  'not_applicable'
);

CREATE TYPE bgc_notice_type AS ENUM (
  'pre',
  'final'
);

CREATE TYPE bgc_question_type AS ENUM (
  'rating',
  'yes_no',
  'open_text',
  'multiple_choice'
);

CREATE TYPE worker_licence_status AS ENUM (
  'active',
  'expired',
  'suspended',
  'cancelled'
);

-- ─── BGC PROVIDERS ────────────────────────────────────────────────────────────
-- Built-in lookup of supported background check providers.

CREATE TABLE bgc_providers (
  code                text        PRIMARY KEY,
  name                text        NOT NULL,
  description         text,
  website_url         text,
  supported_checks    bgc_check_type[],
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── BGC ORGANISATION PROVIDERS ───────────────────────────────────────────────
-- Per-organisation provider credentials and check-type routing.
-- credentials jsonb is encrypted at the application layer before insert.

CREATE TABLE bgc_organisation_providers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  provider_code       text        NOT NULL REFERENCES bgc_providers(code),
  credentials         jsonb,            -- encrypted: api_key, webhook_secret, account_id
  check_type_mapping  jsonb,            -- {"identity": "certn", "criminal_standard": "certn"}
  is_active           boolean     NOT NULL DEFAULT true,
  tested_at           timestamptz,
  test_passed         boolean,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id),
  UNIQUE (organisation_id, provider_code)
);

CREATE INDEX idx_bgc_org_prov_org ON bgc_organisation_providers(organisation_id);

-- ─── BGC CONSENT TEMPLATES ────────────────────────────────────────────────────
-- Versioned consent form HTML. Locked after first use.

CREATE TABLE bgc_consent_templates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        REFERENCES organisations(id) ON DELETE CASCADE,  -- NULL = system default
  version             integer     NOT NULL DEFAULT 1,
  name                text        NOT NULL,
  applies_to_checks   bgc_check_type[],
  body_html           text        NOT NULL,
  is_locked           boolean     NOT NULL DEFAULT false,  -- true once signed by any candidate
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_bgc_consent_tmpl_org ON bgc_consent_templates(organisation_id);

-- ─── BGC ROLE REQUIREMENTS ────────────────────────────────────────────────────
-- Which check types are required / optional / n/a per position.

CREATE TABLE bgc_role_requirements (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  position_title      text        NOT NULL,
  employment_type     text,
  check_type          bgc_check_type NOT NULL,
  requirement_level   bgc_requirement_level NOT NULL DEFAULT 'optional',
  is_sensitive_role   boolean     NOT NULL DEFAULT false,  -- requires vulnerable sector check
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id),
  UNIQUE (organisation_id, position_title, employment_type, check_type)
);

CREATE INDEX idx_bgc_role_req_org ON bgc_role_requirements(organisation_id);

-- ─── BGC PACKAGES ─────────────────────────────────────────────────────────────
-- One package per hire — groups all check orders for one candidate.

CREATE TABLE bgc_packages (
  id                          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             uuid              NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  hire_id                     uuid              REFERENCES hires(id) ON DELETE SET NULL,
  package_number              text              UNIQUE,  -- auto-generated: BGC-0001
  status                      bgc_package_status NOT NULL DEFAULT 'draft',

  -- Candidate details (denormalised for packages not linked to a hire)
  candidate_first_name        text,
  candidate_last_name         text,
  candidate_email             text,
  candidate_dob               date,

  -- Role context
  position_title              text,
  province                    text,
  sensitive_role              boolean           NOT NULL DEFAULT false,

  -- Consent
  consent_email_sent_at       timestamptz,
  consent_given_at            timestamptz,
  consent_withdrawn_at        timestamptz,

  -- Adjudication
  overall_recommendation      bgc_recommendation,
  adjudicated_at              timestamptz,
  adjudicated_by              uuid              REFERENCES auth.users(id),

  created_at                  timestamptz       NOT NULL DEFAULT now(),
  updated_at                  timestamptz       NOT NULL DEFAULT now(),
  created_by                  uuid              REFERENCES auth.users(id)
);

CREATE INDEX idx_bgc_pkg_org        ON bgc_packages(organisation_id);
CREATE INDEX idx_bgc_pkg_hire       ON bgc_packages(hire_id);
CREATE INDEX idx_bgc_pkg_status     ON bgc_packages(status);
CREATE INDEX idx_bgc_pkg_org_status ON bgc_packages(organisation_id, status);

-- Auto-generate package_number
CREATE OR REPLACE FUNCTION generate_bgc_package_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM bgc_packages
  WHERE organisation_id = NEW.organisation_id;
  NEW.package_number := 'BGC-' || LPAD(v_count::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bgc_package_number
  BEFORE INSERT ON bgc_packages
  FOR EACH ROW
  WHEN (NEW.package_number IS NULL)
  EXECUTE FUNCTION generate_bgc_package_number();

-- ─── BGC ORDERS ───────────────────────────────────────────────────────────────
-- One row per check type within a package.

CREATE TABLE bgc_orders (
  id                    uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid              NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  package_id            uuid              NOT NULL REFERENCES bgc_packages(id) ON DELETE CASCADE,
  check_type            bgc_check_type    NOT NULL,
  provider_code         text              REFERENCES bgc_providers(code),
  external_reference_id text,
  status                bgc_order_status  NOT NULL DEFAULT 'consent_pending',
  submitted_at          timestamptz,
  expected_by           timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  error_detail          text,
  created_at            timestamptz       NOT NULL DEFAULT now(),
  updated_at            timestamptz       NOT NULL DEFAULT now(),
  created_by            uuid              REFERENCES auth.users(id),
  UNIQUE (package_id, check_type)
);

CREATE INDEX idx_bgc_order_pkg      ON bgc_orders(package_id);
CREATE INDEX idx_bgc_order_org      ON bgc_orders(organisation_id);
CREATE INDEX idx_bgc_order_status   ON bgc_orders(status);
CREATE INDEX idx_bgc_order_ext_ref  ON bgc_orders(external_reference_id) WHERE external_reference_id IS NOT NULL;

-- ─── BGC CONSENT TOKENS ───────────────────────────────────────────────────────
-- Short-lived tokens for the candidate consent link (token stored as SHA-256 hash).

CREATE TABLE bgc_consent_tokens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      uuid        NOT NULL REFERENCES bgc_packages(id) ON DELETE CASCADE,
  token_hash      text        NOT NULL UNIQUE,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  used_ip         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bgc_token_pkg   ON bgc_consent_tokens(package_id);
CREATE INDEX idx_bgc_token_hash  ON bgc_consent_tokens(token_hash);

-- ─── BGC CONSENT RECORDS ──────────────────────────────────────────────────────
-- Permanent. Never updated or deleted. Immutable legal record.

CREATE TABLE bgc_consent_records (
  id                          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id                  uuid              NOT NULL REFERENCES bgc_packages(id),
  consent_template_id         uuid              REFERENCES bgc_consent_templates(id),
  consent_form_version        integer           NOT NULL,
  consented_check_types       bgc_check_type[]  NOT NULL,
  candidate_signature         text              NOT NULL,
  signed_at                   timestamptz       NOT NULL DEFAULT now(),
  signed_ip                   text,
  consent_email_sent_to       text,
  consent_email_completed_from text,
  consent_pdf_path            text,
  created_at                  timestamptz       NOT NULL DEFAULT now()
  -- No updated_at — this record must never be modified
);

CREATE INDEX idx_bgc_consent_rec_pkg ON bgc_consent_records(package_id);

-- Prevent UPDATE and DELETE on consent records
CREATE RULE no_update_bgc_consent_records AS
  ON UPDATE TO bgc_consent_records DO INSTEAD NOTHING;
CREATE RULE no_delete_bgc_consent_records AS
  ON DELETE TO bgc_consent_records DO INSTEAD NOTHING;

-- ─── BGC RESULTS ──────────────────────────────────────────────────────────────
-- Normalised result per check order.

CREATE TABLE bgc_results (
  id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid                NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  order_id        uuid                NOT NULL REFERENCES bgc_orders(id) ON DELETE CASCADE,
  result_summary  bgc_result_summary  NOT NULL DEFAULT 'pending',
  result_detail   jsonb,
  received_at     timestamptz         NOT NULL DEFAULT now(),
  reviewed_by     uuid                REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz         NOT NULL DEFAULT now(),
  updated_at      timestamptz         NOT NULL DEFAULT now()
);

CREATE INDEX idx_bgc_result_order ON bgc_results(order_id);
CREATE INDEX idx_bgc_result_org   ON bgc_results(organisation_id);

-- ─── BGC RESULT RAW ───────────────────────────────────────────────────────────
-- Encrypted raw provider payload for audit. Application-level encryption.

CREATE TABLE bgc_result_raw (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid        NOT NULL REFERENCES bgc_orders(id) ON DELETE CASCADE,
  provider_code   text        NOT NULL,
  encrypted_payload text      NOT NULL,  -- AES-256 encrypted at application layer
  received_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bgc_raw_order ON bgc_result_raw(order_id);

-- ─── BGC ADVERSE ACTION NOTICES ───────────────────────────────────────────────

CREATE TABLE bgc_adverse_action_notices (
  id                          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             uuid              NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  package_id                  uuid              NOT NULL REFERENCES bgc_packages(id) ON DELETE CASCADE,
  notice_type                 bgc_notice_type   NOT NULL,
  sent_at                     timestamptz,
  sent_to_email               text,
  candidate_acknowledged_at   timestamptz,
  dispute_window_closes_at    timestamptz,
  final_decision_at           timestamptz,
  created_at                  timestamptz       NOT NULL DEFAULT now(),
  updated_at                  timestamptz       NOT NULL DEFAULT now(),
  created_by                  uuid              REFERENCES auth.users(id)
);

CREATE INDEX idx_bgc_adverse_pkg ON bgc_adverse_action_notices(package_id);
CREATE INDEX idx_bgc_adverse_org ON bgc_adverse_action_notices(organisation_id);

-- ─── BGC DISPUTES ─────────────────────────────────────────────────────────────

CREATE TABLE bgc_disputes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  package_id      uuid        NOT NULL REFERENCES bgc_packages(id) ON DELETE CASCADE,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  grounds         text        NOT NULL,
  resolution      text,
  resolved_at     timestamptz,
  resolved_by     uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bgc_dispute_pkg ON bgc_disputes(package_id);

-- ─── BGC ADJUDICATIONS ────────────────────────────────────────────────────────
-- Reviewer sign-off. One per package.

CREATE TABLE bgc_adjudications (
  id                      uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid                NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  package_id              uuid                NOT NULL REFERENCES bgc_packages(id) ON DELETE CASCADE,
  recommendation          bgc_recommendation  NOT NULL,
  rationale               text                NOT NULL,
  human_rights_considered boolean             NOT NULL DEFAULT false,
  adjudicated_by          uuid                NOT NULL REFERENCES auth.users(id),
  adjudicated_at          timestamptz         NOT NULL DEFAULT now(),
  digital_signature       text                NOT NULL,
  created_at              timestamptz         NOT NULL DEFAULT now(),
  UNIQUE (package_id)
);

CREATE INDEX idx_bgc_adj_pkg ON bgc_adjudications(package_id);
CREATE INDEX idx_bgc_adj_org ON bgc_adjudications(organisation_id);

-- ─── BGC REFERENCE TEMPLATES ──────────────────────────────────────────────────

CREATE TABLE bgc_reference_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES organisations(id) ON DELETE CASCADE,  -- NULL = system default
  name            text        NOT NULL,
  role_scope      text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_bgc_ref_tmpl_org ON bgc_reference_templates(organisation_id);

-- ─── BGC REFERENCE QUESTIONS ──────────────────────────────────────────────────

CREATE TABLE bgc_reference_questions (
  id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid                NOT NULL REFERENCES bgc_reference_templates(id) ON DELETE CASCADE,
  question_text   text                NOT NULL,
  question_type   bgc_question_type   NOT NULL DEFAULT 'open_text',
  options         jsonb,              -- for multiple_choice: ["Yes","No","Maybe"]
  is_required     boolean             NOT NULL DEFAULT true,
  display_order   integer             NOT NULL DEFAULT 0,
  created_at      timestamptz         NOT NULL DEFAULT now()
);

CREATE INDEX idx_bgc_ref_q_tmpl ON bgc_reference_questions(template_id);

-- ─── BGC REFERENCE REQUESTS ───────────────────────────────────────────────────

CREATE TABLE bgc_reference_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  package_id          uuid        NOT NULL REFERENCES bgc_packages(id) ON DELETE CASCADE,
  template_id         uuid        REFERENCES bgc_reference_templates(id),
  referee_name        text        NOT NULL,
  referee_title       text,
  referee_company     text,
  referee_email       text        NOT NULL,
  referee_phone       text,
  relationship        text,
  token_hash          text        UNIQUE,
  expires_at          timestamptz,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','sent','opened','completed','declined','no_response')),
  sent_at             timestamptz,
  opened_at           timestamptz,
  completed_at        timestamptz,
  reminder_count      integer     NOT NULL DEFAULT 0,
  last_reminder_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_bgc_ref_req_pkg  ON bgc_reference_requests(package_id);
CREATE INDEX idx_bgc_ref_req_org  ON bgc_reference_requests(organisation_id);
CREATE INDEX idx_bgc_ref_req_hash ON bgc_reference_requests(token_hash) WHERE token_hash IS NOT NULL;

-- ─── BGC REFERENCE RESPONSES ──────────────────────────────────────────────────

CREATE TABLE bgc_reference_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid        NOT NULL REFERENCES bgc_reference_requests(id) ON DELETE CASCADE,
  question_id     uuid        NOT NULL REFERENCES bgc_reference_questions(id) ON DELETE CASCADE,
  response_value  jsonb       NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, question_id)
);

CREATE INDEX idx_bgc_ref_resp_req ON bgc_reference_responses(request_id);

-- ─── BGC REVERIFICATION SCHEDULES ────────────────────────────────────────────

CREATE TABLE bgc_reverification_schedules (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid            NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  position_title  text            NOT NULL,
  check_type      bgc_check_type  NOT NULL,
  interval_months integer         NOT NULL CHECK (interval_months > 0),
  is_active       boolean         NOT NULL DEFAULT true,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  created_by      uuid            REFERENCES auth.users(id),
  UNIQUE (organisation_id, position_title, check_type)
);

CREATE INDEX idx_bgc_rev_sched_org ON bgc_reverification_schedules(organisation_id);

-- ─── BGC REVERIFICATION EVENTS ────────────────────────────────────────────────

CREATE TABLE bgc_reverification_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id       uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  schedule_id     uuid        REFERENCES bgc_reverification_schedules(id) ON DELETE SET NULL,
  check_type      bgc_check_type NOT NULL,
  due_date        date        NOT NULL,
  status          text        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','consent_pending','in_progress','completed','overdue','waived')),
  package_id      uuid        REFERENCES bgc_packages(id),  -- linked once check is ordered
  completed_at    timestamptz,
  waived_at       timestamptz,
  waived_by       uuid        REFERENCES auth.users(id),
  waive_reason    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bgc_rev_evt_org    ON bgc_reverification_events(organisation_id);
CREATE INDEX idx_bgc_rev_evt_worker ON bgc_reverification_events(worker_id);
CREATE INDEX idx_bgc_rev_evt_due    ON bgc_reverification_events(due_date) WHERE status = 'scheduled';

-- ─── WORKER LICENCES ──────────────────────────────────────────────────────────

CREATE TABLE worker_licences (
  id                  uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid                  NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id           uuid                  NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  licence_type        text                  NOT NULL,
  licence_number      text,
  issuing_body        text,
  issuing_province    text,
  issue_date          date,
  expiry_date         date,
  document_path       text,
  status              worker_licence_status NOT NULL DEFAULT 'active',
  notes               text,
  created_at          timestamptz           NOT NULL DEFAULT now(),
  updated_at          timestamptz           NOT NULL DEFAULT now(),
  created_by          uuid                  REFERENCES auth.users(id)
);

CREATE INDEX idx_wl_worker  ON worker_licences(worker_id);
CREATE INDEX idx_wl_org     ON worker_licences(organisation_id);
CREATE INDEX idx_wl_expiry  ON worker_licences(expiry_date) WHERE status = 'active';

-- ─── WORKER LICENCE ALERTS ────────────────────────────────────────────────────

CREATE TABLE worker_licence_alerts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_licence_id   uuid        NOT NULL REFERENCES worker_licences(id) ON DELETE CASCADE,
  alert_type          text        NOT NULL CHECK (alert_type IN ('90day','60day','30day','expired')),
  sent_at             timestamptz NOT NULL DEFAULT now(),
  recipient_user_id   uuid        REFERENCES auth.users(id),
  UNIQUE (worker_licence_id, alert_type)  -- one alert per type per licence cycle
);

CREATE INDEX idx_wla_licence ON worker_licence_alerts(worker_licence_id);
CREATE INDEX idx_wla_org     ON worker_licence_alerts(organisation_id);
