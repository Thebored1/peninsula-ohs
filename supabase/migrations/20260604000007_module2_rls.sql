-- =============================================================
-- MODULE 2: Row Level Security — Auth tables + granular data scoping
-- =============================================================
-- Adds:
--   • Scoping helper functions (the missing piece for cross-site
--     isolation: a Supervisor at Site A must not see Site B data)
--   • RLS on all Module 2 tables
-- =============================================================

-- =============================================================
-- DATA SCOPING HELPERS
-- These functions determine WHICH sites / departments / work areas
-- the current user is allowed to see, based on their role.
--
-- Access matrix:
--   System Admin   → all sites in their org
--   HSE Officer    → all sites in their org
--   Executive      → all sites in their org (read-only)
--   Supervisor     → only their explicitly assigned sites
--   Worker         → only their primary site + assigned sites
-- =============================================================

-- Returns true if the current user can access the given site.
-- Use this in future module RLS policies: USING (can_access_site(site_id))
CREATE OR REPLACE FUNCTION can_access_site(p_site_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN is_system_admin() OR is_hse_officer() OR is_executive() THEN
      -- Wide-access roles: any site in their org
      EXISTS (
        SELECT 1 FROM sites
        WHERE id = p_site_id
          AND organisation_id = get_my_organisation_id()
          AND is_active = true
      )
    ELSE
      -- Supervisor / Worker: only explicitly assigned sites
      p_site_id = ANY(get_my_site_ids())
  END;
$$;

-- Returns the full array of site IDs visible to the current user.
-- Used in IN / ANY predicates across all future module RLS policies.
CREATE OR REPLACE FUNCTION get_accessible_site_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN is_system_admin() OR is_hse_officer() OR is_executive() THEN
      ARRAY(
        SELECT id FROM sites
        WHERE organisation_id = get_my_organisation_id()
          AND is_active = true
      )
    ELSE
      COALESCE(get_my_site_ids(), ARRAY[]::uuid[])
  END;
$$;

-- Returns department IDs the current user can access,
-- derived from their accessible sites.
CREATE OR REPLACE FUNCTION get_accessible_department_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT id FROM departments
    WHERE site_id = ANY(get_accessible_site_ids())
      AND organisation_id = get_my_organisation_id()
  );
$$;

-- Returns work area IDs the current user can access,
-- derived from their accessible departments.
CREATE OR REPLACE FUNCTION get_accessible_work_area_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT id FROM work_areas
    WHERE department_id = ANY(get_accessible_department_ids())
      AND organisation_id = get_my_organisation_id()
  );
$$;

-- =============================================================
-- ENABLE RLS ON MODULE 2 TABLES
-- =============================================================

ALTER TABLE auth_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_providers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE row_versions        ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- AUTH EVENTS
-- Users see only their own events.
-- System Admin and HSE Officer see all events in their org.
-- INSERT / UPDATE / DELETE are blocked — only SECURITY DEFINER
-- functions (log_auth_event, handle_auth_user_login) write here.
-- =============================================================

CREATE POLICY "ae_select_own" ON auth_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ae_select_elevated" ON auth_events FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- USER SESSIONS
-- Users see and can revoke their own sessions.
-- System Admin sees and can revoke any session in their org.
-- =============================================================

CREATE POLICY "us_select_own" ON user_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "us_select_admin" ON user_sessions FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- Users can update (revoke) their own sessions
CREATE POLICY "us_update_own" ON user_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can update (revoke) any session in their org
CREATE POLICY "us_update_admin" ON user_sessions FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- record_user_session() runs SECURITY DEFINER — no INSERT policy needed

-- =============================================================
-- SSO PROVIDERS
-- All org members can read the list of configured providers
-- (needed for login-page "Sign in with…" display).
-- Only System Admins can create / edit / delete.
-- =============================================================

CREATE POLICY "sso_select" ON sso_providers FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "sso_insert" ON sso_providers FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "sso_update" ON sso_providers FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "sso_delete" ON sso_providers FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- USER IDENTITY LINKS
-- Users can view their own identity links.
-- System Admins can view all links in their org.
-- Inserts happen via SECURITY DEFINER functions on SSO callback.
-- =============================================================

CREATE POLICY "uil_select_own" ON user_identity_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "uil_select_admin" ON user_identity_links FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- ROW VERSIONS
-- Full version history is sensitive — restricted to System Admin
-- and HSE Officer. Workers / Supervisors / Executives cannot
-- browse change history. The SECURITY DEFINER trigger writes here;
-- no user-level INSERT / UPDATE / DELETE policies exist.
-- =============================================================

CREATE POLICY "rv_select" ON row_versions FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );
