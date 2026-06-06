-- =============================================================
-- MODULE 2: Authentication & Authorisation — Core Schema
-- =============================================================
-- Builds on Module 1. Adds:
--   • auth_events      — every login/logout/SSO/MFA event
--   • user_sessions    — active session tracking for force-logout
--   • sso_providers    — per-org SAML / OIDC / OAuth2 config
--   • user_identity_links — maps auth.users to SSO provider identities
--   • row_versions     — sequential, complete row-level snapshots
--                        (complements audit_logs diffs; enables
--                         point-in-time reconstruction of any record)
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE auth_event_type_enum AS ENUM (
  'login_success',
  'login_failed',
  'logout',
  'sso_login',
  'token_refreshed',
  'password_reset_requested',
  'password_changed',
  'mfa_enabled',
  'mfa_disabled',
  'mfa_challenged',
  'mfa_passed',
  'mfa_failed',
  'session_revoked',
  'account_locked',
  'account_unlocked'
);

CREATE TYPE sso_provider_type_enum AS ENUM (
  'saml',
  'oidc',
  'oauth2'
);

-- =============================================================
-- AUTH EVENTS
-- Append-only log of every authentication action.
-- Login/logout events never touch our application tables, so the
-- general DML audit trigger cannot capture them — this table fills
-- that gap. Written only by SECURITY DEFINER trigger functions.
-- =============================================================

CREATE TABLE auth_events (
  id               uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid                  REFERENCES organisations(id),
  user_id          uuid                  REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email       text,                 -- denormalised; survives user deletion
  event_type       auth_event_type_enum  NOT NULL,
  provider         text,                 -- 'email', 'google', 'saml', 'oidc', etc.
  session_id       text,                 -- JWT jti / Supabase session ID
  ip_address       text,
  user_agent       text,
  success          boolean               NOT NULL DEFAULT true,
  failure_reason   text,                 -- populated on failed events
  metadata         jsonb,                -- SSO attributes, MFA method, extra context
  created_at       timestamptz           NOT NULL DEFAULT now()
);

-- Append-only — no one should mutate the event log
CREATE RULE no_update_auth_events AS ON UPDATE TO auth_events DO INSTEAD NOTHING;
CREATE RULE no_delete_auth_events AS ON DELETE TO auth_events DO INSTEAD NOTHING;

-- =============================================================
-- USER SESSIONS
-- Tracks every active session for concurrent-session auditing
-- and admin force-logout. The application layer (or an Edge
-- Function) calls record_user_session() on login and
-- revoke_user_session() on logout / admin force-logout.
-- =============================================================

CREATE TABLE user_sessions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id      uuid        REFERENCES organisations(id),
  supabase_session_id  text,       -- JWT jti — used to correlate with Supabase auth.sessions
  provider             text        NOT NULL DEFAULT 'email',
  ip_address           text,
  user_agent           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  last_active_at       timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz,
  is_active            boolean     NOT NULL DEFAULT true,
  revoked_at           timestamptz,
  revoked_by           uuid        REFERENCES auth.users(id),
  revoke_reason        text        -- 'logout','force_logout','expired','admin_revoke'
);

-- =============================================================
-- SSO PROVIDERS
-- One configuration record per SSO integration per organisation.
-- Supports SAML 2.0, OIDC, and OAuth2.
-- NOTE: client_secret should be stored via Supabase Vault in
-- production; the column holds the encrypted/wrapped value.
-- =============================================================

CREATE TABLE sso_providers (
  id                  uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid                   NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name                text                   NOT NULL,
  provider_type       sso_provider_type_enum NOT NULL,
  email_domain        text,                  -- auto-route users with this domain to this IdP
  metadata_url        text,                  -- SAML: IdP metadata URL
  metadata_xml        text,                  -- SAML: raw metadata XML (fallback / offline)
  client_id           text,                  -- OIDC / OAuth2
  client_secret       text,                  -- OIDC / OAuth2 — use Supabase Vault in prod
  oidc_discovery_url  text,                  -- OIDC well-known discovery URL
  attribute_mappings  jsonb,                 -- { "email": "emailAddress", "first_name": "givenName" }
  scopes              text[],                -- OAuth2/OIDC requested scopes
  is_active           boolean                NOT NULL DEFAULT true,
  created_at          timestamptz            NOT NULL DEFAULT now(),
  updated_at          timestamptz            NOT NULL DEFAULT now(),
  created_by          uuid                   REFERENCES auth.users(id),
  UNIQUE (organisation_id, email_domain)
);

-- =============================================================
-- USER IDENTITY LINKS
-- Maps an auth.users record to one or more SSO provider identities.
-- A user can have links to multiple providers (e.g. Google + SAML).
-- =============================================================

CREATE TABLE user_identity_links (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id      uuid        NOT NULL REFERENCES organisations(id),
  sso_provider_id      uuid        NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
  provider_user_id     text        NOT NULL,  -- the user's unique ID at the IdP
  provider_user_email  text,
  last_sign_in_at      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sso_provider_id, provider_user_id)
);

-- =============================================================
-- ROW VERSIONS
-- Sequential, complete row-level snapshots for every audited table.
--
-- How it differs from audit_logs:
--   audit_logs  → field-level diffs; "what changed in this update?"
--   row_versions→ full before/after snapshots with monotonic version
--                 numbers; "give me version 4 of this record" /
--                 "reconstruct the entire record as it was on date X"
--
-- Written only by the row_version_trigger_function (SECURITY DEFINER).
-- Append-only. Version numbers are per (table_name, record_id).
-- =============================================================

CREATE TABLE row_versions (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid,
  table_name       text              NOT NULL,
  record_id        text              NOT NULL,
  version_number   integer           NOT NULL,     -- starts at 1; monotonically increasing
  action           audit_action_enum NOT NULL,     -- reuses Module 1 enum
  snapshot         jsonb             NOT NULL,     -- complete row AFTER this action
  changed_fields   jsonb,                          -- {field: {from, to}} for UPDATE only
  changed_by       uuid              REFERENCES auth.users(id),
  changed_by_email text,                           -- denormalised; survives user deletion
  ip_address       text,
  created_at       timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (table_name, record_id, version_number)
);

-- Append-only
CREATE RULE no_update_row_versions AS ON UPDATE TO row_versions DO INSTEAD NOTHING;
CREATE RULE no_delete_row_versions AS ON DELETE TO row_versions DO INSTEAD NOTHING;

-- =============================================================
-- INDEXES
-- =============================================================

-- auth_events
CREATE INDEX idx_ae_org_id      ON auth_events(organisation_id);
CREATE INDEX idx_ae_user_id     ON auth_events(user_id);
CREATE INDEX idx_ae_event_type  ON auth_events(event_type);
CREATE INDEX idx_ae_created_at  ON auth_events(created_at DESC);
CREATE INDEX idx_ae_failures    ON auth_events(user_email, created_at DESC) WHERE success = false;

-- user_sessions
CREATE INDEX idx_us_user_id     ON user_sessions(user_id);
CREATE INDEX idx_us_org_id      ON user_sessions(organisation_id);
CREATE INDEX idx_us_active      ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_us_supa_sid    ON user_sessions(supabase_session_id);

-- sso_providers
CREATE INDEX idx_sso_org_id     ON sso_providers(organisation_id);
CREATE INDEX idx_sso_domain     ON sso_providers(email_domain) WHERE email_domain IS NOT NULL;

-- user_identity_links
CREATE INDEX idx_uil_user_id    ON user_identity_links(user_id);
CREATE INDEX idx_uil_provider   ON user_identity_links(sso_provider_id);

-- row_versions
CREATE INDEX idx_rv_table_rec   ON row_versions(table_name, record_id);
CREATE INDEX idx_rv_org_id      ON row_versions(organisation_id);
CREATE INDEX idx_rv_changed_by  ON row_versions(changed_by);
CREATE INDEX idx_rv_created_at  ON row_versions(created_at DESC);
CREATE INDEX idx_rv_version     ON row_versions(table_name, record_id, version_number DESC);
