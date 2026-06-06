-- =============================================================
-- MODULE 3: Notifications & Alerts — Core Schema
-- =============================================================
-- Concepts:
--   notification_templates      — reusable content with {{variable}} substitution
--   notification_rules          — event → recipient → channel wiring
--   notification_rule_recipients— who gets notified per rule
--   notification_preferences    — per-user channel opt-in/out, quiet hours, push tokens
--   notification_schedules      — cron-based digest / scheduled sends
--   notifications               — the inbox (one row per recipient per event)
--   notification_deliveries     — the outbound queue (one row per channel per notification)
--   escalation_chains           — named ordered escalation sequences
--   escalation_steps            — individual steps: delay + who to notify
--   active_escalations          — in-flight escalation timers (reset on acknowledgement)
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE notification_channel_enum AS ENUM (
  'in_app',
  'email',
  'sms',
  'push'
);

CREATE TYPE notification_status_enum AS ENUM (
  'unread',
  'read',
  'acknowledged',
  'dismissed',
  'expired'
);

CREATE TYPE delivery_status_enum AS ENUM (
  'queued',
  'sending',
  'delivered',
  'failed',
  'retrying',
  'cancelled',
  'skipped'          -- user had this channel disabled / no address on file
);

-- =============================================================
-- NOTIFICATION TEMPLATES
-- organisation_id IS NULL = system template (visible to every org
-- as a read-only default). Orgs can create their own overrides.
-- Variables use {{double_braces}} syntax — resolved at send time.
-- =============================================================

CREATE TABLE notification_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  trigger_event    text        NOT NULL,   -- e.g. 'incidents.submitted'
  name             text        NOT NULL,   -- human label
  description      text,
  subject_template text        NOT NULL,   -- used for email subject + push title
  body_template    text        NOT NULL,   -- plain-text body with {{variables}}
  html_template    text,                   -- optional rich HTML version for email
  available_vars   jsonb,                  -- { "site_name": "Name of the site", ... }
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id),
  UNIQUE (organisation_id, trigger_event, name)
);

-- =============================================================
-- NOTIFICATION RULES
-- Connects a trigger_event to a template, a set of recipients,
-- and an optional escalation chain. One event can match multiple
-- rules (e.g. both "notify reporter's supervisor" and "notify
-- all HSE Officers" fire on incidents.submitted).
-- =============================================================

CREATE TABLE notification_rules (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  description          text,
  trigger_event        text        NOT NULL,   -- e.g. 'incidents.submitted'
  template_id          uuid        NOT NULL REFERENCES notification_templates(id),
  escalation_chain_id  uuid,                   -- FK added after escalation_chains exists
  channels             notification_channel_enum[] NOT NULL DEFAULT ARRAY['in_app'::notification_channel_enum],
  conditions           jsonb,                  -- optional filter: {"severity": ["high","critical"]}
  cooldown_minutes     integer     NOT NULL DEFAULT 0,  -- min gap between same-event notifications
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- NOTIFICATION RULE RECIPIENTS
-- Who receives a notification for a given rule.
-- recipient_type:
--   'user'               → a specific user_id
--   'role'               → everyone holding role_id in the org/site
--   'reporter'           → the user who triggered the event (from event data)
--   'site_manager'       → the primary manager of the event's site
--   'department_manager' → the manager of the event's department
-- site_scoped: if true and a site_id is present on the event,
--   only users assigned to that site are included.
-- =============================================================

CREATE TABLE notification_rule_recipients (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        uuid        NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
  recipient_type text        NOT NULL
                             CHECK (recipient_type IN (
                               'user','role','reporter',
                               'site_manager','department_manager'
                             )),
  role_id        uuid        REFERENCES roles(id) ON DELETE SET NULL,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  site_scoped    boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- NOTIFICATION PREFERENCES
-- Per-user, per-channel opt-in/out, quiet hours, and device tokens.
-- Defaults: in_app=on, email=on, sms=off (requires opt-in),
--           push=off (requires device registration).
-- =============================================================

CREATE TABLE notification_preferences (
  id                uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid                     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id   uuid                     NOT NULL REFERENCES organisations(id),
  channel           notification_channel_enum NOT NULL,
  is_enabled        boolean                  NOT NULL DEFAULT true,
  quiet_hours_start time,                    -- local time, e.g. '22:00'
  quiet_hours_end   time,                    -- local time, e.g. '07:00'
  digest_enabled    boolean                  NOT NULL DEFAULT false,
  digest_frequency  text                     NOT NULL DEFAULT 'daily'
                                             CHECK (digest_frequency IN ('hourly','daily','weekly')),
  -- Channel-specific delivery addresses (override user_profile defaults)
  email_address     text,                    -- if NULL, falls back to auth.users.email
  phone_number      text,                    -- SMS target; if NULL, falls back to user_profiles.mobile
  push_token        text,                    -- FCM / APNS device token
  updated_at        timestamptz              NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

-- =============================================================
-- NOTIFICATION SCHEDULES
-- Drives digest / periodic notification sends.
-- A scheduled job (pg_cron or Edge Function) polls this table,
-- executes the associated rule for all matching recipients,
-- and updates last_run_at / next_run_at.
-- =============================================================

CREATE TABLE notification_schedules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  rule_id         uuid        NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  cron_expression text        NOT NULL,   -- standard 5-part cron: '0 8 * * 1'
  timezone        text        NOT NULL DEFAULT 'UTC',
  last_run_at     timestamptz,
  next_run_at     timestamptz,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- NOTIFICATIONS (THE INBOX)
-- One row per (recipient user × event occurrence).
-- The in_app channel is driven directly by this table via
-- Supabase Realtime — no separate delivery row needed for in_app
-- (the delivery trigger still logs it for consistency).
-- =============================================================

CREATE TABLE notifications (
  id                   uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid                     NOT NULL REFERENCES organisations(id),
  recipient_user_id    uuid                     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id              uuid                     REFERENCES notification_rules(id) ON DELETE SET NULL,
  template_id          uuid                     REFERENCES notification_templates(id) ON DELETE SET NULL,
  trigger_event        text                     NOT NULL,
  trigger_entity_type  text,                    -- 'incident', 'permit', 'document', etc.
  trigger_entity_id    uuid,                    -- PK of the triggering entity
  -- Rendered content (resolved at creation time — templates can change later)
  title                text                     NOT NULL,
  body                 text                     NOT NULL,
  data                 jsonb,                   -- arbitrary context for deep-linking
  channels_requested   notification_channel_enum[] NOT NULL DEFAULT ARRAY['in_app'::notification_channel_enum],
  -- Inbox state
  status               notification_status_enum NOT NULL DEFAULT 'unread',
  is_read              boolean                  NOT NULL DEFAULT false,
  read_at              timestamptz,
  acknowledged_at      timestamptz,             -- resets escalation timer when set
  dismissed_at         timestamptz,
  expires_at           timestamptz,
  created_at           timestamptz              NOT NULL DEFAULT now()
);

-- =============================================================
-- NOTIFICATION DELIVERIES (THE OUTBOUND QUEUE)
-- One row per (notification × channel). Polling workers / Edge
-- Functions select WHERE status IN ('queued','retrying')
-- AND (next_attempt_at IS NULL OR next_attempt_at <= now()).
-- They update status, attempt_count, and provider_message_id.
-- =============================================================

CREATE TABLE notification_deliveries (
  id                  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     uuid                     NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel             notification_channel_enum NOT NULL,
  recipient_address   text                     NOT NULL,  -- email / phone / device token / user_id
  status              delivery_status_enum     NOT NULL DEFAULT 'queued',
  attempt_count       integer                  NOT NULL DEFAULT 0,
  max_attempts        integer                  NOT NULL DEFAULT 3,
  next_attempt_at     timestamptz              NOT NULL DEFAULT now(),
  last_attempt_at     timestamptz,
  delivered_at        timestamptz,
  error_message       text,
  provider_message_id text,                    -- SendGrid / Twilio / FCM message ID
  created_at          timestamptz              NOT NULL DEFAULT now(),
  updated_at          timestamptz              NOT NULL DEFAULT now()
);

-- =============================================================
-- ESCALATION CHAINS
-- A named sequence of escalation steps. Assigned to a rule via
-- notification_rules.escalation_chain_id.
-- =============================================================

CREATE TABLE escalation_chains (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- Deferred FK: notification_rules.escalation_chain_id → escalation_chains
ALTER TABLE notification_rules
  ADD CONSTRAINT fk_rule_escalation_chain
  FOREIGN KEY (escalation_chain_id) REFERENCES escalation_chains(id) ON DELETE SET NULL;

-- =============================================================
-- ESCALATION STEPS
-- Each step defines a delay and who to notify if no
-- acknowledgement has been received by that point.
-- =============================================================

CREATE TABLE escalation_steps (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id        uuid        NOT NULL REFERENCES escalation_chains(id) ON DELETE CASCADE,
  step_number     integer     NOT NULL,          -- 1 = first escalation, 2 = second, …
  delay_minutes   integer     NOT NULL,          -- wait this long after previous step
  notify_role_id  uuid        REFERENCES roles(id) ON DELETE SET NULL,
  notify_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  channels        notification_channel_enum[] NOT NULL DEFAULT ARRAY['in_app'::notification_channel_enum, 'email'::notification_channel_enum],
  template_id     uuid        REFERENCES notification_templates(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain_id, step_number),
  CHECK (notify_role_id IS NOT NULL OR notify_user_id IS NOT NULL)
);

-- =============================================================
-- ACTIVE ESCALATIONS
-- One row per in-flight escalation. Created when a notification
-- with an escalation chain is sent. Cancelled when the
-- notification is acknowledged. The scheduler polls
-- next_escalation_at to fire the next step.
-- =============================================================

CREATE TABLE active_escalations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     uuid        NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  chain_id            uuid        NOT NULL REFERENCES escalation_chains(id),
  current_step        integer     NOT NULL DEFAULT 0,    -- 0 = initial send, not yet escalated
  last_escalated_at   timestamptz,
  next_escalation_at  timestamptz NOT NULL,
  is_active           boolean     NOT NULL DEFAULT true,
  resolved_at         timestamptz,
  resolved_by         uuid        REFERENCES auth.users(id),
  resolution_type     text        CHECK (resolution_type IN ('acknowledged','cancelled','completed'))
);

-- =============================================================
-- INDEXES
-- =============================================================

-- notification_templates
CREATE INDEX idx_nt_event        ON notification_templates(trigger_event);
CREATE INDEX idx_nt_org_id       ON notification_templates(organisation_id);

-- notification_rules
CREATE INDEX idx_nr_org_event    ON notification_rules(organisation_id, trigger_event) WHERE is_active = true;
CREATE INDEX idx_nr_template     ON notification_rules(template_id);

-- notification_rule_recipients
CREATE INDEX idx_nrr_rule_id     ON notification_rule_recipients(rule_id);

-- notification_preferences
CREATE INDEX idx_np_user_id      ON notification_preferences(user_id);

-- notification_schedules
CREATE INDEX idx_ns_next_run     ON notification_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_ns_org_id       ON notification_schedules(organisation_id);

-- notifications
CREATE INDEX idx_notif_recipient ON notifications(recipient_user_id, status);
CREATE INDEX idx_notif_unread    ON notifications(recipient_user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notif_org       ON notifications(organisation_id, created_at DESC);
CREATE INDEX idx_notif_entity    ON notifications(trigger_entity_type, trigger_entity_id);
CREATE INDEX idx_notif_rule      ON notifications(rule_id);

-- notification_deliveries
CREATE INDEX idx_nd_queue        ON notification_deliveries(status, next_attempt_at)
                                 WHERE status IN ('queued','retrying');
CREATE INDEX idx_nd_notif_id     ON notification_deliveries(notification_id);
CREATE INDEX idx_nd_channel      ON notification_deliveries(channel, status);

-- escalation_chains
CREATE INDEX idx_ec_org_id       ON escalation_chains(organisation_id);

-- escalation_steps
CREATE INDEX idx_es_chain_id     ON escalation_steps(chain_id, step_number);

-- active_escalations
CREATE INDEX idx_ae2_next_esc    ON active_escalations(next_escalation_at) WHERE is_active = true;
CREATE INDEX idx_ae2_notif_id    ON active_escalations(notification_id);
