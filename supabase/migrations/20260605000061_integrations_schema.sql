-- =============================================================
-- INTEGRATIONS & API — Schema
-- =============================================================
-- Design principles:
--   • Integration types are a lookup table.
--   • Sensitive config values (API tokens, passwords) are stored
--     as text — the application layer encrypts these before insert
--     using Supabase Vault or application-level encryption.
--   • API keys: only the SHA-256 hash is stored; the plaintext key
--     is returned once at creation and never stored again.
--   • Webhooks fan-out from the notifications table via trigger —
--     no module needs webhook-specific code.
--   • Webhook deliveries are append-only with retry state.
--
-- Tables (10):
--   integration_types             — lookup: hris, sso_saml, erp, etc.
--   integrations                  — configured integration instances per org
--   integration_field_mappings    — HRIS/ERP field-to-field maps
--   integration_sync_logs         — sync run history
--   api_keys                      — customer API keys (hash only)
--   api_key_scopes                — permission scopes per key
--   webhook_endpoints             — registered webhook destination URLs
--   webhook_event_types           — subscribable event codes
--   webhook_endpoint_subscriptions— which events each endpoint receives
--   webhook_deliveries            — delivery attempt log (append-only)
-- =============================================================

-- =============================================================
-- INTEGRATION TYPES
-- =============================================================

CREATE TABLE integration_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  category      text        NOT NULL DEFAULT 'data_sync'
                            CHECK (category IN ('data_sync','auth','messaging','analytics','api')),
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INTEGRATIONS
-- One row per configured integration per org.
-- config jsonb holds non-sensitive settings (endpoint URLs,
-- sync schedules, field mapping rules).
-- credentials jsonb holds sensitive values — the app layer
-- encrypts these; this schema stores whatever is returned.
-- =============================================================

CREATE TABLE integrations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  integration_type_id uuid        NOT NULL REFERENCES integration_types(id),
  name                text        NOT NULL,
  description         text,
  config              jsonb       NOT NULL DEFAULT '{}',
  credentials         jsonb       NOT NULL DEFAULT '{}', -- ENCRYPTED by app layer
  status              text        NOT NULL DEFAULT 'inactive'
                                  CHECK (status IN ('active','inactive','error','pending_setup')),
  last_sync_at        timestamptz,
  last_sync_status    text        CHECK (last_sync_status IN ('success','partial','failed')),
  last_sync_error     text,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- INTEGRATION FIELD MAPPINGS
-- Maps source system fields to EXXIO schema fields.
-- transformation jsonb: {"trim":true,"lowercase":true,"format":"date"}
-- =============================================================

CREATE TABLE integration_field_mappings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  uuid        NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  source_field    text        NOT NULL,   -- field name in the external system
  target_table    text        NOT NULL,   -- EXXIO table name
  target_field    text        NOT NULL,   -- EXXIO column name
  transformation  jsonb       NOT NULL DEFAULT '{}',
  is_required     boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INTEGRATION SYNC LOGS
-- Append-only log of every sync run.
-- =============================================================

CREATE TABLE integration_sync_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    uuid        NOT NULL REFERENCES integrations(id),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  triggered_by      uuid        REFERENCES auth.users(id),  -- NULL = automated
  trigger_type      text        NOT NULL DEFAULT 'scheduled'
                                CHECK (trigger_type IN ('manual','scheduled','webhook_inbound')),
  status            text        NOT NULL DEFAULT 'running'
                                CHECK (status IN ('running','completed','partial','failed')),
  records_processed integer     NOT NULL DEFAULT 0,
  records_created   integer     NOT NULL DEFAULT 0,
  records_updated   integer     NOT NULL DEFAULT 0,
  records_skipped   integer     NOT NULL DEFAULT 0,
  records_errored   integer     NOT NULL DEFAULT 0,
  error_details     jsonb,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE RULE no_update_sync_logs AS ON UPDATE TO integration_sync_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_sync_logs AS ON DELETE TO integration_sync_logs DO INSTEAD NOTHING;

-- =============================================================
-- API KEYS
-- Customer-generated keys for REST API access.
-- ONLY the SHA-256 hash is stored. The plaintext key is shown
-- once at creation. key_prefix is the first 12 chars for display.
-- Environment: 'live' | 'test'
-- =============================================================

CREATE TABLE api_keys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  name            text        NOT NULL,
  description     text,
  key_prefix      text        NOT NULL,    -- first 12 chars: 'sk_live_abcd'
  key_hash        text        NOT NULL,    -- SHA-256 of the full key
  environment     text        NOT NULL DEFAULT 'live'
                              CHECK (environment IN ('live','test')),
  last_used_at    timestamptz,
  expires_at      timestamptz,
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  is_active       boolean     NOT NULL DEFAULT true,
  revoked_at      timestamptz,
  revoked_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        NOT NULL REFERENCES auth.users(id),
  UNIQUE (key_hash)
);

-- =============================================================
-- API KEY SCOPES
-- Fine-grained permissions per key.
-- scope_code: 'incidents:read', 'actions:write', 'webhooks:manage', etc.
-- =============================================================

CREATE TABLE api_key_scopes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      uuid        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  scope_code      text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (api_key_id, scope_code)
);

-- =============================================================
-- WEBHOOK EVENT TYPES
-- Every event that can trigger a webhook delivery.
-- Maps to the same event codes used by the notification system.
-- =============================================================

CREATE TABLE webhook_event_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,  -- 'incident.created', 'action.overdue'
  name          text        NOT NULL,
  description   text,
  module        text,        -- source module: 'incidents','actions', etc.
  sample_payload jsonb,      -- example payload shape for documentation
  display_order integer      NOT NULL DEFAULT 0,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

-- =============================================================
-- WEBHOOK ENDPOINTS
-- A registered URL that receives HTTP POST events.
-- signing_secret is used to compute HMAC-SHA256 signatures
-- on every delivery (X-EXXIO-Signature header).
-- =============================================================

CREATE TABLE webhook_endpoints (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  name            text        NOT NULL,
  url             text        NOT NULL,
  signing_secret  text        NOT NULL,    -- HMAC signing secret
  description     text,
  -- Delivery config
  timeout_seconds integer     NOT NULL DEFAULT 30,
  max_retries     integer     NOT NULL DEFAULT 3,
  retry_delay_seconds integer NOT NULL DEFAULT 60,
  -- Auth headers (optional extra auth beyond HMAC)
  custom_headers  jsonb       NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count   integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- WEBHOOK ENDPOINT SUBSCRIPTIONS
-- Which event types a given endpoint receives.
-- =============================================================

CREATE TABLE webhook_endpoint_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     uuid        NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type_id   uuid        NOT NULL REFERENCES webhook_event_types(id),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, event_type_id)
);

-- =============================================================
-- WEBHOOK DELIVERIES
-- Append-only delivery attempt log.
-- Each delivery attempt is a new row (attempt_number increments).
-- next_retry_at is set for exponential backoff.
-- =============================================================

CREATE TABLE webhook_deliveries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id         uuid        NOT NULL REFERENCES webhook_endpoints(id),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  event_type_code     text        NOT NULL,
  -- Source notification or entity
  notification_id     uuid        REFERENCES notifications(id) ON DELETE SET NULL,
  source_type         text,
  source_id           uuid,
  payload             jsonb       NOT NULL DEFAULT '{}',
  -- Delivery state
  attempt_number      integer     NOT NULL DEFAULT 1,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','delivering','delivered','failed','abandoned')),
  response_status_code integer,
  response_body       text,
  error_message       text,
  delivered_at        timestamptz,
  next_retry_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE RULE no_update_webhook_deliveries AS ON UPDATE TO webhook_deliveries DO INSTEAD NOTHING;
CREATE RULE no_delete_webhook_deliveries AS ON DELETE TO webhook_deliveries DO INSTEAD NOTHING;

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_integrations_org      ON integrations(organisation_id, status);
CREATE INDEX idx_ifm_integration       ON integration_field_mappings(integration_id);
CREATE INDEX idx_isl_integration       ON integration_sync_logs(integration_id, started_at DESC);
CREATE INDEX idx_isl_org_status        ON integration_sync_logs(organisation_id, status);
CREATE INDEX idx_apikey_org_active     ON api_keys(organisation_id) WHERE is_active = true;
CREATE INDEX idx_apikey_hash           ON api_keys(key_hash) WHERE is_active = true;  -- auth lookups
CREATE INDEX idx_aks_key_id            ON api_key_scopes(api_key_id);
CREATE INDEX idx_whet_code             ON webhook_event_types(code);
CREATE INDEX idx_whe_org_active        ON webhook_endpoints(organisation_id) WHERE is_active = true;
CREATE INDEX idx_whes_endpoint         ON webhook_endpoint_subscriptions(endpoint_id);
CREATE INDEX idx_whd_endpoint_status   ON webhook_deliveries(endpoint_id, status);
CREATE INDEX idx_whd_pending           ON webhook_deliveries(next_retry_at)
                                       WHERE status IN ('pending','failed');
CREATE INDEX idx_whd_notification      ON webhook_deliveries(notification_id);
