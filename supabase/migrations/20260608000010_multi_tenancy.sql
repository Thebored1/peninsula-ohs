-- =============================================================
-- Multi-Tenancy Phase 1: subdomain, onboarding tracking,
-- and super admin tables
-- =============================================================

-- 1. Add subdomain column to organisations
--    Keep slug untouched — it is still used in bootstrap_organisation()
--    and app/actions/auth.ts.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS subdomain text UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_subdomain ON organisations(subdomain);

-- Backfill: copy slug → subdomain for any existing orgs
UPDATE organisations SET subdomain = slug WHERE subdomain IS NULL;

-- 2. Update bootstrap_organisation() to also set subdomain = slug
CREATE OR REPLACE FUNCTION bootstrap_organisation(
  p_org_name   text,
  p_first_name text,
  p_last_name  text,
  p_industry   text DEFAULT NULL,
  p_timezone   text DEFAULT 'UTC'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_org_id    uuid;
  v_slug      text;
  v_base_slug text;
  v_suffix    int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Organisation already set up for this account';
  END IF;

  IF trim(p_org_name) = '' THEN
    RAISE EXCEPTION 'Organisation name is required';
  END IF;
  IF trim(p_first_name) = '' THEN
    RAISE EXCEPTION 'First name is required';
  END IF;

  v_base_slug := lower(trim(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'), '-'));
  v_slug      := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM organisations WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug   := v_base_slug || '-' || v_suffix;
  END LOOP;

  INSERT INTO organisations (name, slug, subdomain, industry, timezone, created_by)
  VALUES (
    trim(p_org_name),
    v_slug,
    v_slug,
    nullif(trim(p_industry), ''),
    coalesce(nullif(trim(p_timezone), ''), 'UTC'),
    v_user_id
  )
  RETURNING id INTO v_org_id;

  INSERT INTO user_profiles (id, organisation_id, first_name, last_name, email)
  SELECT
    v_user_id,
    v_org_id,
    trim(p_first_name),
    coalesce(nullif(trim(p_last_name), ''), ''),
    u.email
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE
    SET organisation_id = EXCLUDED.organisation_id,
        first_name      = EXCLUDED.first_name,
        last_name       = EXCLUDED.last_name,
        updated_at      = now();

  INSERT INTO user_roles (user_id, role_id, organisation_id, granted_by)
  SELECT v_user_id, r.id, v_org_id, v_user_id
  FROM roles r
  WHERE r.name = 'System Admin' AND r.is_system_role = true
  ON CONFLICT (user_id, role_id, organisation_id, site_id) DO NOTHING;

  RETURN jsonb_build_object(
    'organisation_id', v_org_id,
    'user_id',         v_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION bootstrap_organisation(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bootstrap_organisation(text, text, text, text, text) TO authenticated;

-- 3. Super admin tables (accessed only via service_role, no RLS needed)
CREATE TABLE IF NOT EXISTS super_admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS super_admin_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id  uuid NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  token_hash      text NOT NULL UNIQUE,
  expires_at      timestamptz NOT NULL,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sa_sessions_token   ON super_admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sa_sessions_expires ON super_admin_sessions(expires_at);

-- 4. Impersonation audit log
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id  uuid NOT NULL REFERENCES super_admins(id),
  action          text NOT NULL,
  target_org_id   uuid REFERENCES organisations(id) ON DELETE SET NULL,
  target_org_name text,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sa_audit_admin  ON super_admin_audit_log(super_admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sa_audit_org    ON super_admin_audit_log(target_org_id, created_at DESC);
