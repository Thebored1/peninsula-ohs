-- =============================================================
-- MODULE 1: Triggers — updated_at + comprehensive audit logging
-- =============================================================

-- =============================================================
-- UPDATED_AT HELPER
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_areas_updated_at
  BEFORE UPDATE ON work_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- AUDIT TRIGGER FUNCTION
-- Captures: who, what table, what record, what action,
-- full before/after snapshots, field-level diff,
-- IP address, user-agent, request-id from PostgREST headers.
-- =============================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_data       jsonb;
  v_new_data       jsonb;
  v_changed_fields jsonb := '{}';
  v_user_id        uuid;
  v_user_email     text;
  v_ip_address     text;
  v_user_agent     text;
  v_request_id     text;
  v_org_id         uuid;
  v_record_id      text;
  v_key            text;
  v_old_val        jsonb;
  v_new_val        jsonb;
  v_headers        jsonb;
BEGIN
  -- Current authenticated user
  v_user_id := auth.uid();

  -- Extract request metadata from PostgREST headers (best-effort)
  BEGIN
    v_headers    := current_setting('request.headers', true)::jsonb;
    v_ip_address := coalesce(
                      v_headers->>'x-forwarded-for',
                      v_headers->>'x-real-ip'
                    );
    v_user_agent := v_headers->>'user-agent';
    v_request_id := v_headers->>'x-request-id';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- headers not available (e.g. called from trigger/function context)
  END;

  -- Denormalize email so log survives user deletion
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  END IF;

  -- ---- DELETE ------------------------------------------------
  IF TG_OP = 'DELETE' THEN
    v_old_data  := to_jsonb(OLD);
    v_record_id := v_old_data->>'id';
    -- organisations table has no organisation_id column — use its own id
    v_org_id := CASE TG_TABLE_NAME
                  WHEN 'organisations' THEN (v_old_data->>'id')::uuid
                  ELSE (v_old_data->>'organisation_id')::uuid
                END;

    INSERT INTO audit_logs (
      organisation_id, table_name, record_id, action,
      old_data, new_data, changed_fields,
      changed_by, changed_by_email,
      ip_address, user_agent, request_id
    ) VALUES (
      v_org_id, TG_TABLE_NAME, v_record_id, 'DELETE',
      v_old_data, NULL, NULL,
      v_user_id, v_user_email,
      v_ip_address, v_user_agent, v_request_id
    );
    RETURN OLD;

  -- ---- INSERT ------------------------------------------------
  ELSIF TG_OP = 'INSERT' THEN
    v_new_data  := to_jsonb(NEW);
    v_record_id := v_new_data->>'id';
    v_org_id := CASE TG_TABLE_NAME
                  WHEN 'organisations' THEN (v_new_data->>'id')::uuid
                  ELSE (v_new_data->>'organisation_id')::uuid
                END;

    INSERT INTO audit_logs (
      organisation_id, table_name, record_id, action,
      old_data, new_data, changed_fields,
      changed_by, changed_by_email,
      ip_address, user_agent, request_id
    ) VALUES (
      v_org_id, TG_TABLE_NAME, v_record_id, 'INSERT',
      NULL, v_new_data, NULL,
      v_user_id, v_user_email,
      v_ip_address, v_user_agent, v_request_id
    );
    RETURN NEW;

  -- ---- UPDATE ------------------------------------------------
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
    v_record_id := v_new_data->>'id';
    v_org_id := CASE TG_TABLE_NAME
                  WHEN 'organisations' THEN (v_new_data->>'id')::uuid
                  ELSE (v_new_data->>'organisation_id')::uuid
                END;

    -- Field-level diff
    FOR v_key IN SELECT jsonb_object_keys(v_new_data)
    LOOP
      v_old_val := v_old_data->v_key;
      v_new_val := v_new_data->v_key;
      IF v_old_val IS DISTINCT FROM v_new_val THEN
        v_changed_fields := v_changed_fields || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old_val, 'to', v_new_val)
        );
      END IF;
    END LOOP;

    -- Skip noise-only updates (e.g. updated_at touched with no real change)
    IF v_changed_fields = '{}' OR
       v_changed_fields = jsonb_build_object(
         'updated_at', jsonb_build_object('from', v_old_data->'updated_at', 'to', v_new_data->'updated_at')
       )
    THEN
      RETURN NEW;
    END IF;

    INSERT INTO audit_logs (
      organisation_id, table_name, record_id, action,
      old_data, new_data, changed_fields,
      changed_by, changed_by_email,
      ip_address, user_agent, request_id
    ) VALUES (
      v_org_id, TG_TABLE_NAME, v_record_id, 'UPDATE',
      v_old_data, v_new_data, v_changed_fields,
      v_user_id, v_user_email,
      v_ip_address, v_user_agent, v_request_id
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Apply audit trigger to every table that needs full change tracking
CREATE TRIGGER audit_organisations
  AFTER INSERT OR UPDATE OR DELETE ON organisations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_sites
  AFTER INSERT OR UPDATE OR DELETE ON sites
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_departments
  AFTER INSERT OR UPDATE OR DELETE ON departments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_work_areas
  AFTER INSERT OR UPDATE OR DELETE ON work_areas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_teams
  AFTER INSERT OR UPDATE OR DELETE ON teams
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_site_assignments
  AFTER INSERT OR UPDATE OR DELETE ON user_site_assignments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_team_memberships
  AFTER INSERT OR UPDATE OR DELETE ON user_team_memberships
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================================
-- AUTO-TRACK DOCUMENT VERSIONS ON UPLOAD
-- When a new document version row is inserted, bump
-- the parent document's current_version counter.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_document_current_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE documents
  SET current_version = NEW.version_number,
      updated_at      = now()
  WHERE id = NEW.document_id
    AND NEW.version_number > current_version;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_document_version
  AFTER INSERT ON document_versions
  FOR EACH ROW EXECUTE FUNCTION sync_document_current_version();

-- =============================================================
-- AUTO-CREATE USER_PROFILE ON SIGNUP
-- When a new row appears in auth.users, create a minimal
-- user_profile so every auth user has a profile record.
-- The organisation_id must be supplied during signup via
-- raw_user_meta_data->>'organisation_id'.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id   uuid;
  v_fname    text;
  v_lname    text;
BEGIN
  v_org_id := (NEW.raw_user_meta_data->>'organisation_id')::uuid;
  v_fname  := coalesce(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1));
  v_lname  := coalesce(NEW.raw_user_meta_data->>'last_name', '');

  IF v_org_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, organisation_id, first_name, last_name, email)
    VALUES (NEW.id, v_org_id, v_fname, v_lname, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
