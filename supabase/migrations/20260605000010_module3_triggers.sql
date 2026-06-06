-- =============================================================
-- MODULE 3: Triggers & Functions — Notification engine
-- =============================================================

-- =============================================================
-- UPDATED_AT HOUSEKEEPING
-- =============================================================

CREATE TRIGGER trg_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_schedules_updated_at
  BEFORE UPDATE ON notification_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_deliveries_updated_at
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_escalation_chains_updated_at
  BEFORE UPDATE ON escalation_chains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TEMPLATE RENDERING
-- Replaces every {{variable_name}} in a template string with
-- the matching value from a jsonb variables object.
-- Unresolved variables are left as empty string.
-- =============================================================

CREATE OR REPLACE FUNCTION render_template(
  p_template  text,
  p_variables jsonb
) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_result text := p_template;
  v_key    text;
BEGIN
  IF p_variables IS NULL OR p_template IS NULL THEN
    RETURN p_template;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_variables)
  LOOP
    v_result := regexp_replace(
      v_result,
      '\{\{' || v_key || '\}\}',
      COALESCE(p_variables->>v_key, ''),
      'g'
    );
  END LOOP;

  -- Strip any remaining unresolved {{variables}}
  v_result := regexp_replace(v_result, '\{\{[^}]+\}\}', '', 'g');

  RETURN v_result;
END;
$$;

-- =============================================================
-- AUTO-CREATE DELIVERY ROWS WHEN A NOTIFICATION IS INSERTED
-- Fires AFTER INSERT on notifications.
-- Creates one notification_deliveries row per requested channel.
-- Resolves the recipient address per channel:
--   in_app  → the user's UUID (Realtime subscription key)
--   email   → preference override → auth.users.email
--   sms     → preference override → user_profiles.mobile
--   push    → preference push_token (must be explicitly registered)
-- Rows with no resolvable address get status='skipped'.
-- =============================================================

CREATE OR REPLACE FUNCTION create_notification_deliveries()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_channel   notification_channel_enum;
  v_address   text;
  v_pref      record;
BEGIN
  -- Load user's preferences once (all channels)
  SELECT
    MAX(CASE WHEN channel = 'email' THEN COALESCE(email_address,  (SELECT email  FROM auth.users WHERE id = NEW.recipient_user_id)) END) AS email,
    MAX(CASE WHEN channel = 'sms'   THEN COALESCE(phone_number,   (SELECT mobile FROM user_profiles WHERE id = NEW.recipient_user_id)) END) AS sms,
    MAX(CASE WHEN channel = 'push'  THEN push_token END) AS push,
    -- Respect is_enabled flags per channel
    BOOL_AND(CASE WHEN channel = 'email' THEN is_enabled ELSE true END) AS email_enabled,
    BOOL_AND(CASE WHEN channel = 'sms'   THEN is_enabled ELSE true END) AS sms_enabled,
    BOOL_AND(CASE WHEN channel = 'push'  THEN is_enabled ELSE true END) AS push_enabled
  INTO v_pref
  FROM notification_preferences
  WHERE user_id = NEW.recipient_user_id;

  FOREACH v_channel IN ARRAY NEW.channels_requested
  LOOP
    v_address := NULL;

    CASE v_channel
      WHEN 'in_app' THEN
        -- in_app is always deliverable; address = user UUID for Realtime subscription
        v_address := NEW.recipient_user_id::text;

      WHEN 'email' THEN
        IF COALESCE(v_pref.email_enabled, true) THEN
          v_address := COALESCE(
            v_pref.email,
            (SELECT email FROM auth.users WHERE id = NEW.recipient_user_id)
          );
        END IF;

      WHEN 'sms' THEN
        IF COALESCE(v_pref.sms_enabled, false) THEN   -- SMS off by default
          v_address := COALESCE(
            v_pref.sms,
            (SELECT mobile FROM user_profiles WHERE id = NEW.recipient_user_id)
          );
        END IF;

      WHEN 'push' THEN
        IF COALESCE(v_pref.push_enabled, false) THEN  -- push off until device registered
          v_address := v_pref.push;
        END IF;
    END CASE;

    INSERT INTO notification_deliveries (
      notification_id, channel, recipient_address,
      status, next_attempt_at
    ) VALUES (
      NEW.id,
      v_channel,
      COALESCE(v_address, 'unknown'),
      CASE WHEN v_address IS NOT NULL THEN 'queued' ELSE 'skipped' END::delivery_status_enum,
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_notification_deliveries
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION create_notification_deliveries();

-- =============================================================
-- AUTO-START ESCALATION WHEN A NOTIFICATION IS INSERTED
-- Only fires if the matched rule has an escalation_chain_id.
-- =============================================================

CREATE OR REPLACE FUNCTION start_escalation_if_required()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chain_id        uuid;
  v_first_delay_min integer;
BEGIN
  -- Find the chain for this rule (if any)
  SELECT r.escalation_chain_id
  INTO v_chain_id
  FROM notification_rules r
  WHERE r.id = NEW.rule_id
    AND r.escalation_chain_id IS NOT NULL;

  IF v_chain_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Delay until step 1
  SELECT delay_minutes INTO v_first_delay_min
  FROM escalation_steps
  WHERE chain_id = v_chain_id AND step_number = 1;

  IF v_first_delay_min IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO active_escalations (
    notification_id, chain_id,
    current_step, next_escalation_at
  ) VALUES (
    NEW.id, v_chain_id,
    0,
    now() + (v_first_delay_min || ' minutes')::interval
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_start_escalation
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION start_escalation_if_required();

-- =============================================================
-- CANCEL ESCALATION ON ACKNOWLEDGEMENT
-- When acknowledged_at is set on a notification, cancel any
-- active escalation and update the notification status.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_notification_acknowledged()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only act when acknowledged_at is newly set
  IF OLD.acknowledged_at IS NOT NULL OR NEW.acknowledged_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cancel the active escalation
  UPDATE active_escalations
  SET is_active       = false,
      resolved_at     = now(),
      resolved_by     = auth.uid(),
      resolution_type = 'acknowledged'
  WHERE notification_id = NEW.id
    AND is_active = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_notification_acknowledged
  AFTER UPDATE OF acknowledged_at ON notifications
  FOR EACH ROW EXECUTE FUNCTION handle_notification_acknowledged();

-- =============================================================
-- RETRY SCHEDULING HELPER
-- Called by the delivery worker (Edge Function) after a failed
-- delivery attempt. Applies exponential back-off:
--   attempt 1 → +2 min, attempt 2 → +8 min, attempt 3 → permanent failure
-- =============================================================

CREATE OR REPLACE FUNCTION schedule_delivery_retry(
  p_delivery_id   uuid,
  p_error_message text DEFAULT NULL
) RETURNS delivery_status_enum LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_delivery     record;
  v_new_status   delivery_status_enum;
  v_next_attempt timestamptz;
BEGIN
  SELECT * INTO v_delivery
  FROM notification_deliveries
  WHERE id = p_delivery_id;

  IF v_delivery.attempt_count >= v_delivery.max_attempts THEN
    v_new_status   := 'failed';
    v_next_attempt := NULL;
  ELSE
    v_new_status   := 'retrying';
    -- Exponential back-off: 2^attempt_count minutes
    v_next_attempt := now() + (power(2, v_delivery.attempt_count + 1) || ' minutes')::interval;
  END IF;

  UPDATE notification_deliveries
  SET status          = v_new_status,
      attempt_count   = attempt_count + 1,
      last_attempt_at = now(),
      next_attempt_at = COALESCE(v_next_attempt, next_attempt_at),
      error_message   = p_error_message,
      updated_at      = now()
  WHERE id = p_delivery_id;

  RETURN v_new_status;
END;
$$;

-- =============================================================
-- MARK DELIVERY DELIVERED
-- Called by the delivery worker on success.
-- =============================================================

CREATE OR REPLACE FUNCTION mark_delivery_delivered(
  p_delivery_id       uuid,
  p_provider_message_id text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notification_deliveries
  SET status              = 'delivered',
      attempt_count       = attempt_count + 1,
      last_attempt_at     = now(),
      delivered_at        = now(),
      provider_message_id = p_provider_message_id,
      updated_at          = now()
  WHERE id = p_delivery_id;
END;
$$;

-- =============================================================
-- create_notification()
-- The main engine called by the application / Edge Functions
-- when an OHS event occurs. It:
--   1. Finds all active rules matching (organisation_id, trigger_event)
--   2. For each rule, resolves the recipient user list
--   3. Renders the template with the provided variable data
--   4. Inserts notification rows (delivery rows created by trigger)
--   5. Returns the count of notifications created
--
-- p_data can contain:
--   reporter_id, site_name, site_id, department_name,
--   incident_type, permit_number, action_title,
--   training_name, due_date — and any template {{variable}}
-- =============================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_trigger_event       text,
  p_organisation_id     uuid,
  p_site_id             uuid    DEFAULT NULL,
  p_trigger_entity_type text    DEFAULT NULL,
  p_trigger_entity_id   uuid    DEFAULT NULL,
  p_data                jsonb   DEFAULT '{}'
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rule          record;
  v_template      record;
  v_recipient_id  uuid;
  v_title         text;
  v_body          text;
  v_created_count integer := 0;
  v_data          jsonb;
BEGIN
  -- Enrich p_data with site/org names for template substitution
  v_data := p_data;
  IF p_site_id IS NOT NULL AND v_data->>'site_name' IS NULL THEN
    SELECT name INTO STRICT v_data
    FROM (
      SELECT p_data || jsonb_build_object('site_name', s.name) AS jval
      FROM sites s WHERE s.id = p_site_id
    ) sub(jval);
  END IF;

  -- Iterate over every active matching rule
  FOR v_rule IN
    SELECT nr.*, ec.is_active AS chain_active
    FROM notification_rules nr
    LEFT JOIN escalation_chains ec ON ec.id = nr.escalation_chain_id
    WHERE nr.organisation_id = p_organisation_id
      AND nr.trigger_event   = p_trigger_event
      AND nr.is_active       = true
  LOOP
    -- Load the template (org-specific override takes priority over system template)
    SELECT * INTO v_template
    FROM notification_templates
    WHERE trigger_event = p_trigger_event
      AND (organisation_id = p_organisation_id OR organisation_id IS NULL)
      AND id = v_rule.template_id
      AND is_active = true
    ORDER BY organisation_id NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_title := render_template(v_template.subject_template, v_data);
    v_body  := render_template(v_template.body_template,   v_data);

    -- Resolve recipients
    FOR v_recipient_id IN
      -- Direct user recipients
      SELECT nrr.user_id
      FROM notification_rule_recipients nrr
      WHERE nrr.rule_id        = v_rule.id
        AND nrr.recipient_type = 'user'
        AND nrr.user_id IS NOT NULL

      UNION

      -- Role-based recipients (optionally site-scoped)
      SELECT ur.user_id
      FROM notification_rule_recipients nrr
      JOIN user_roles ur ON ur.role_id        = nrr.role_id
                         AND ur.organisation_id = p_organisation_id
                         AND ur.is_active      = true
                         AND (ur.expires_at IS NULL OR ur.expires_at > now())
      WHERE nrr.rule_id        = v_rule.id
        AND nrr.recipient_type = 'role'
        AND nrr.role_id IS NOT NULL
        AND (
          NOT nrr.site_scoped
          OR p_site_id IS NULL
          OR ur.site_id = p_site_id
        )

      UNION

      -- Reporter (the user who triggered the event)
      SELECT (v_data->>'reporter_id')::uuid
      FROM notification_rule_recipients nrr
      WHERE nrr.rule_id          = v_rule.id
        AND nrr.recipient_type   = 'reporter'
        AND v_data->>'reporter_id' IS NOT NULL

      UNION

      -- Site manager
      SELECT up.id
      FROM notification_rule_recipients nrr
      JOIN departments d  ON d.site_id = p_site_id
      JOIN user_profiles up ON up.id = d.manager_id
      WHERE nrr.rule_id        = v_rule.id
        AND nrr.recipient_type = 'site_manager'
        AND p_site_id IS NOT NULL
        AND up.id IS NOT NULL
    LOOP
      INSERT INTO notifications (
        organisation_id, recipient_user_id,
        rule_id, template_id,
        trigger_event, trigger_entity_type, trigger_entity_id,
        title, body, data,
        channels_requested
      ) VALUES (
        p_organisation_id, v_recipient_id,
        v_rule.id, v_template.id,
        p_trigger_event, p_trigger_entity_type, p_trigger_entity_id,
        v_title, v_body, v_data,
        v_rule.channels
      );
      v_created_count := v_created_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_created_count;
END;
$$;

-- =============================================================
-- USER-FACING NOTIFICATION MANAGEMENT
-- Called directly from the frontend / application layer.
-- =============================================================

-- acknowledge_notification — marks read + acknowledged, resets escalation
CREATE OR REPLACE FUNCTION acknowledge_notification(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications
  SET status          = 'acknowledged',
      is_read         = true,
      read_at         = COALESCE(read_at, now()),
      acknowledged_at = now()
  WHERE id              = p_notification_id
    AND recipient_user_id = auth.uid();
END;
$$;

-- dismiss_notification — hides from inbox without ACK
CREATE OR REPLACE FUNCTION dismiss_notification(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications
  SET status       = 'dismissed',
      is_read      = true,
      read_at      = COALESCE(read_at, now()),
      dismissed_at = now()
  WHERE id              = p_notification_id
    AND recipient_user_id = auth.uid();
END;
$$;

-- mark_notifications_read — bulk mark-as-read for the inbox UI
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = COALESCE(read_at, now()),
      status  = CASE
                  WHEN status = 'unread' THEN 'read'::notification_status_enum
                  ELSE status
                END
  WHERE id              = ANY(p_notification_ids)
    AND recipient_user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- get_unread_count — efficient bell-icon counter
CREATE OR REPLACE FUNCTION get_unread_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE recipient_user_id = auth.uid()
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- =============================================================
-- FIRE_ESCALATION_STEP()
-- Called by the scheduler (Edge Function / pg_cron) when
-- active_escalations.next_escalation_at <= now().
-- Sends notifications for the current step and advances the timer.
-- =============================================================

CREATE OR REPLACE FUNCTION fire_escalation_step(p_escalation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_esc           record;
  v_next_step     record;
  v_after_step    record;
  v_orig_notif    record;
  v_recipient_id  uuid;
  v_title         text;
  v_body          text;
BEGIN
  SELECT * INTO v_esc
  FROM active_escalations
  WHERE id = p_escalation_id AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  -- Get the step to fire now
  SELECT * INTO v_next_step
  FROM escalation_steps
  WHERE chain_id    = v_esc.chain_id
    AND step_number = v_esc.current_step + 1;

  IF NOT FOUND THEN
    -- No more steps — mark escalation completed
    UPDATE active_escalations
    SET is_active       = false,
        resolved_at     = now(),
        resolution_type = 'completed'
    WHERE id = p_escalation_id;
    RETURN;
  END IF;

  SELECT * INTO v_orig_notif FROM notifications WHERE id = v_esc.notification_id;

  -- Resolve escalation template (step override or fall back to original)
  SELECT subject_template, body_template INTO v_title, v_body
  FROM notification_templates
  WHERE id = COALESCE(v_next_step.template_id, v_orig_notif.template_id);

  v_title := COALESCE(render_template(v_title, v_orig_notif.data), v_orig_notif.title);
  v_body  := COALESCE(render_template(v_body,  v_orig_notif.data), v_orig_notif.body);

  -- Notify the escalation step's recipients
  FOR v_recipient_id IN
    -- Specific user
    SELECT v_next_step.notify_user_id WHERE v_next_step.notify_user_id IS NOT NULL
    UNION
    -- Role members
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role_id         = v_next_step.notify_role_id
      AND ur.organisation_id = v_orig_notif.organisation_id
      AND ur.is_active       = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  LOOP
    INSERT INTO notifications (
      organisation_id, recipient_user_id,
      rule_id, template_id,
      trigger_event, trigger_entity_type, trigger_entity_id,
      title, body, data,
      channels_requested
    ) VALUES (
      v_orig_notif.organisation_id, v_recipient_id,
      v_orig_notif.rule_id, COALESCE(v_next_step.template_id, v_orig_notif.template_id),
      v_orig_notif.trigger_event || '.escalation',
      v_orig_notif.trigger_entity_type,
      v_orig_notif.trigger_entity_id,
      '[ESCALATION] ' || v_title,
      v_body,
      v_orig_notif.data || jsonb_build_object('escalation_step', v_next_step.step_number),
      v_next_step.channels
    );
  END LOOP;

  -- Advance to the next step
  SELECT * INTO v_after_step
  FROM escalation_steps
  WHERE chain_id    = v_esc.chain_id
    AND step_number = v_next_step.step_number + 1;

  UPDATE active_escalations
  SET current_step       = v_next_step.step_number,
      last_escalated_at  = now(),
      next_escalation_at = CASE
                             WHEN v_after_step IS NOT NULL
                             THEN now() + (v_after_step.delay_minutes || ' minutes')::interval
                             ELSE next_escalation_at  -- no further steps; keep until ACK
                           END,
      is_active = CASE
                    WHEN v_after_step IS NOT NULL THEN true
                    ELSE false   -- final step fired; escalation complete
                  END,
      resolved_at     = CASE WHEN v_after_step IS NULL THEN now()    ELSE NULL END,
      resolution_type = CASE WHEN v_after_step IS NULL THEN 'completed' ELSE NULL END
  WHERE id = p_escalation_id;
END;
$$;
