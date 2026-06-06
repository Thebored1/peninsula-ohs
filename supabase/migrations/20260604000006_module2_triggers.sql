-- =============================================================
-- MODULE 2: Triggers — Row versioning, auth event capture,
--           session management RPC functions, history helper
-- =============================================================

-- =============================================================
-- ROW VERSION TRIGGER FUNCTION
-- Fires AFTER every INSERT / UPDATE / DELETE on audited tables.
-- Writes a complete row snapshot to row_versions with a
-- monotonically-increasing version_number per (table, record).
--
-- Noise suppression: UPDATE events that only change updated_at
-- (timestamp heartbeats) are silently skipped — same rule as
-- the audit_trigger_function in Module 1.
-- =============================================================

CREATE OR REPLACE FUNCTION row_version_trigger_function()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_snapshot       jsonb;
  v_old_snapshot   jsonb;
  v_changed_fields jsonb := '{}';
  v_user_id        uuid;
  v_user_email     text;
  v_ip_address     text;
  v_org_id         uuid;
  v_record_id      text;
  v_version_number integer;
  v_key            text;
  v_headers        jsonb;
BEGIN
  v_user_id := auth.uid();

  BEGIN
    v_headers    := current_setting('request.headers', true)::jsonb;
    v_ip_address := coalesce(
                      v_headers->>'x-forwarded-for',
                      v_headers->>'x-real-ip'
                    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  END IF;

  -- ---- Resolve snapshot, record_id, org_id ----
  IF TG_OP = 'DELETE' THEN
    v_snapshot  := to_jsonb(OLD);
  ELSE
    v_snapshot  := to_jsonb(NEW);
  END IF;

  v_record_id := v_snapshot->>'id';
  v_org_id    := CASE TG_TABLE_NAME
                   WHEN 'organisations' THEN (v_snapshot->>'id')::uuid
                   ELSE (v_snapshot->>'organisation_id')::uuid
                 END;

  -- ---- Next version number for this record ----
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM row_versions
   WHERE table_name = TG_TABLE_NAME
     AND record_id  = v_record_id;

  -- ---- Field diff (UPDATE only) ----
  IF TG_OP = 'UPDATE' THEN
    v_old_snapshot := to_jsonb(OLD);

    FOR v_key IN SELECT jsonb_object_keys(v_snapshot)
    LOOP
      IF (v_old_snapshot->v_key) IS DISTINCT FROM (v_snapshot->v_key) THEN
        v_changed_fields := v_changed_fields || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old_snapshot->v_key, 'to', v_snapshot->v_key)
        );
      END IF;
    END LOOP;

    -- Skip noise-only updates (only updated_at changed)
    IF v_changed_fields = '{}' OR
       v_changed_fields = jsonb_build_object(
         'updated_at', jsonb_build_object(
           'from', v_old_snapshot->'updated_at',
           'to',   v_snapshot->'updated_at'
         )
       )
    THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO row_versions (
    organisation_id, table_name, record_id, version_number,
    action, snapshot, changed_fields,
    changed_by, changed_by_email, ip_address
  ) VALUES (
    v_org_id, TG_TABLE_NAME, v_record_id, v_version_number,
    TG_OP::audit_action_enum,
    v_snapshot,
    NULLIF(v_changed_fields, '{}'),
    v_user_id, v_user_email, v_ip_address
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- =============================================================
-- APPLY ROW VERSIONING TO ALL AUDITED TABLES
-- Same table set as the audit triggers in Module 1.
-- PostgreSQL fires AFTER triggers alphabetically per event, so
-- 'audit_*' fires before 'version_*' on every table.
-- =============================================================

CREATE TRIGGER version_organisations
  AFTER INSERT OR UPDATE OR DELETE ON organisations
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_sites
  AFTER INSERT OR UPDATE OR DELETE ON sites
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_departments
  AFTER INSERT OR UPDATE OR DELETE ON departments
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_work_areas
  AFTER INSERT OR UPDATE OR DELETE ON work_areas
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_teams
  AFTER INSERT OR UPDATE OR DELETE ON teams
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_roles
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

-- =============================================================
-- UPDATED_AT FOR NEW TABLES
-- =============================================================

CREATE TRIGGER trg_sso_providers_updated_at
  BEFORE UPDATE ON sso_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- AUTH EVENT CAPTURE — LOGIN
-- Fires when auth.users.last_sign_in_at changes, which Supabase
-- updates on every successful login (email/password and SSO).
-- Failed login attempts cannot be captured at the SQL layer;
-- those must be logged from the application / Edge Function by
-- calling log_auth_event() directly.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_auth_user_login()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  uuid;
  v_headers jsonb;
  v_ip      text;
  v_ua      text;
  v_provider text;
BEGIN
  SELECT organisation_id INTO v_org_id
  FROM user_profiles WHERE id = NEW.id;

  BEGIN
    v_headers  := current_setting('request.headers', true)::jsonb;
    v_ip       := coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip');
    v_ua       := v_headers->>'user-agent';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  v_provider := coalesce(NEW.app_metadata->>'provider', 'email');

  INSERT INTO auth_events (
    organisation_id, user_id, user_email,
    event_type, provider, ip_address, user_agent, success
  ) VALUES (
    v_org_id, NEW.id, NEW.email,
    'login_success', v_provider, v_ip, v_ua, true
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_signed_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at
        AND NEW.last_sign_in_at IS NOT NULL)
  EXECUTE FUNCTION handle_auth_user_login();

-- =============================================================
-- log_auth_event()
-- Called by application / Edge Functions to record auth events
-- that cannot be captured by SQL triggers — failed logins, MFA
-- challenges, password resets, SSO initiation, force-logouts, etc.
-- Runs SECURITY DEFINER so the service-role key is not required.
-- =============================================================

CREATE OR REPLACE FUNCTION log_auth_event(
  p_event_type    auth_event_type_enum,
  p_user_id       uuid        DEFAULT NULL,
  p_user_email    text        DEFAULT NULL,
  p_provider      text        DEFAULT NULL,
  p_session_id    text        DEFAULT NULL,
  p_success       boolean     DEFAULT true,
  p_failure_reason text       DEFAULT NULL,
  p_ip_address    text        DEFAULT NULL,
  p_user_agent    text        DEFAULT NULL,
  p_metadata      jsonb       DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id    uuid;
  v_event_id  uuid;
  v_uid       uuid;
BEGIN
  -- Resolve user from parameter or current session
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid IS NOT NULL THEN
    SELECT organisation_id INTO v_org_id
    FROM user_profiles WHERE id = v_uid;
  END IF;

  INSERT INTO auth_events (
    organisation_id, user_id, user_email,
    event_type, provider, session_id,
    ip_address, user_agent,
    success, failure_reason, metadata
  ) VALUES (
    v_org_id,
    v_uid,
    COALESCE(p_user_email, (SELECT email FROM auth.users WHERE id = v_uid)),
    p_event_type,
    p_provider,
    p_session_id,
    p_ip_address,
    p_user_agent,
    p_success,
    p_failure_reason,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- =============================================================
-- SESSION MANAGEMENT RPC FUNCTIONS
-- Called by the application layer on login and logout.
-- =============================================================

-- record_user_session()
-- Call after a successful Supabase sign-in. Returns the session UUID.
CREATE OR REPLACE FUNCTION record_user_session(
  p_supabase_session_id text,
  p_provider            text    DEFAULT 'email',
  p_ip_address          text    DEFAULT NULL,
  p_user_agent          text    DEFAULT NULL,
  p_expires_in_days     integer DEFAULT 7
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session_id uuid;
  v_org_id     uuid;
BEGIN
  SELECT organisation_id INTO v_org_id
  FROM user_profiles WHERE id = auth.uid();

  INSERT INTO user_sessions (
    user_id, organisation_id, supabase_session_id,
    provider, ip_address, user_agent,
    expires_at
  ) VALUES (
    auth.uid(), v_org_id, p_supabase_session_id,
    p_provider, p_ip_address, p_user_agent,
    now() + (p_expires_in_days || ' days')::interval
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- revoke_user_session()
-- Marks a session as revoked. Users can revoke their own sessions;
-- System Admins can revoke any session in their org. The application
-- layer must additionally call the Supabase Admin API
-- (DELETE /auth/v1/admin/users/{uid}/sessions/{sid}) to invalidate
-- the JWT on Supabase's side.
CREATE OR REPLACE FUNCTION revoke_user_session(
  p_session_id    uuid,
  p_revoke_reason text DEFAULT 'logout'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_sessions
  SET is_active     = false,
      revoked_at    = now(),
      revoked_by    = auth.uid(),
      revoke_reason = p_revoke_reason
  WHERE id = p_session_id
    AND (
      user_id = auth.uid()               -- own session
      OR (
        organisation_id = get_my_organisation_id()
        AND is_system_admin()            -- admin revokes any org session
      )
    );

  -- Log the revocation event
  PERFORM log_auth_event(
    p_event_type := 'session_revoked',
    p_metadata   := jsonb_build_object('session_id', p_session_id, 'reason', p_revoke_reason)
  );
END;
$$;

-- revoke_all_user_sessions()
-- Force-logs out every active session for a given user.
-- System Admin only (except users revoking their own).
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
  p_target_user_id uuid,
  p_revoke_reason  text DEFAULT 'admin_revoke'
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_target_user_id <> auth.uid() AND NOT is_system_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  UPDATE user_sessions
  SET is_active     = false,
      revoked_at    = now(),
      revoked_by    = auth.uid(),
      revoke_reason = p_revoke_reason
  WHERE user_id  = p_target_user_id
    AND is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM log_auth_event(
    p_event_type := 'session_revoked',
    p_user_id    := p_target_user_id,
    p_metadata   := jsonb_build_object(
                      'sessions_revoked', v_count,
                      'reason', p_revoke_reason,
                      'revoked_by', auth.uid()
                    )
  );

  RETURN v_count;
END;
$$;

-- =============================================================
-- get_record_history()
-- Returns the full version history for any record in any table.
-- Access is gated by RLS on row_versions (Admin / HSE Officer).
-- =============================================================

CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name text,
  p_record_id  text
) RETURNS TABLE (
  version_number   integer,
  action           audit_action_enum,
  snapshot         jsonb,
  changed_fields   jsonb,
  changed_by_email text,
  ip_address       text,
  created_at       timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    version_number,
    action,
    snapshot,
    changed_fields,
    changed_by_email,
    ip_address,
    created_at
  FROM row_versions
  WHERE table_name = p_table_name
    AND record_id  = p_record_id
  ORDER BY version_number ASC;
$$;

-- =============================================================
-- get_record_at_version()
-- Reconstructs the exact state of a record at a given version.
-- Useful for auditors: "show me what user_profile X looked like
-- before version 7 was applied."
-- =============================================================

CREATE OR REPLACE FUNCTION get_record_at_version(
  p_table_name   text,
  p_record_id    text,
  p_version      integer
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT snapshot
  FROM row_versions
  WHERE table_name    = p_table_name
    AND record_id     = p_record_id
    AND version_number = p_version;
$$;
