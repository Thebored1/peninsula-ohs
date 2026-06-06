-- =============================================================
-- MODULE 1: Row Level Security Policies
-- =============================================================
-- Principle: every table is locked down by default.
-- Access is granted via role-based helper functions.
-- =============================================================

-- =============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS for lookups)
-- =============================================================

-- Returns the current user's organisation_id
CREATE OR REPLACE FUNCTION get_my_organisation_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organisation_id FROM user_profiles WHERE id = auth.uid();
$$;

-- Returns true if current user holds the named role (org-wide or site-scoped)
CREATE OR REPLACE FUNCTION user_has_role(p_role_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id    = auth.uid()
      AND r.name        = p_role_name
      AND ur.is_active  = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- Returns true if current user has the given module+action permission
CREATE OR REPLACE FUNCTION user_has_permission(p_module text, p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id    = ur.role_id
    JOIN permissions p       ON p.id          = rp.permission_id
    WHERE ur.user_id    = auth.uid()
      AND ur.is_active  = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND p.module      = p_module
      AND p.action      = p_action
  );
$$;

-- Convenience wrappers for the five built-in roles
CREATE OR REPLACE FUNCTION is_system_admin()   RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT user_has_role('System Admin');  $$;
CREATE OR REPLACE FUNCTION is_hse_officer()    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT user_has_role('HSE Officer');    $$;
CREATE OR REPLACE FUNCTION is_supervisor()     RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT user_has_role('Supervisor');     $$;
CREATE OR REPLACE FUNCTION is_executive()      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT user_has_role('Executive');      $$;

-- Returns all site IDs the current user is assigned to
CREATE OR REPLACE FUNCTION get_my_site_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT array_agg(site_id)
  FROM user_site_assignments
  WHERE user_id = auth.uid();
$$;

-- =============================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================

ALTER TABLE organisations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_areas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_team_memberships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- ORGANISATIONS
-- Read: any member of the org
-- Write: System Admin only
-- =============================================================

CREATE POLICY "orgs_select" ON organisations FOR SELECT
  USING (id = get_my_organisation_id());

CREATE POLICY "orgs_insert" ON organisations FOR INSERT
  WITH CHECK (is_system_admin());

CREATE POLICY "orgs_update" ON organisations FOR UPDATE
  USING (id = get_my_organisation_id() AND is_system_admin());

CREATE POLICY "orgs_delete" ON organisations FOR DELETE
  USING (is_system_admin());

-- =============================================================
-- SITES
-- Read: any org member
-- Write: System Admin or HSE Officer
-- =============================================================

CREATE POLICY "sites_select" ON sites FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "sites_insert" ON sites FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "sites_update" ON sites FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "sites_delete" ON sites FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- DEPARTMENTS
-- Read: any org member
-- Write: System Admin or HSE Officer
-- =============================================================

CREATE POLICY "depts_select" ON departments FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "depts_insert" ON departments FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "depts_update" ON departments FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "depts_delete" ON departments FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- WORK AREAS
-- Read: any org member
-- Write: Admin, HSE Officer, or Supervisor
-- =============================================================

CREATE POLICY "work_areas_select" ON work_areas FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "work_areas_insert" ON work_areas FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "work_areas_update" ON work_areas FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "work_areas_delete" ON work_areas FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- TEAMS
-- Read: any org member
-- Write: Admin, HSE Officer, or Supervisor
-- =============================================================

CREATE POLICY "teams_select" ON teams FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "teams_insert" ON teams FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "teams_update" ON teams FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "teams_delete" ON teams FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- ROLES
-- Read: any org member (they need to know available roles)
-- Write: System Admin only
-- =============================================================

CREATE POLICY "roles_select" ON roles FOR SELECT
  USING (
    organisation_id IS NULL                      -- system roles visible to all
    OR organisation_id = get_my_organisation_id()
  );

CREATE POLICY "roles_insert" ON roles FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "roles_update" ON roles FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
    AND is_system_role = false                   -- built-in roles are immutable
  );

CREATE POLICY "roles_delete" ON roles FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
    AND is_system_role = false
  );

-- =============================================================
-- PERMISSIONS  (reference data — read only for org members)
-- =============================================================

CREATE POLICY "permissions_select" ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only service-role / migrations can insert/update permissions
-- (no INSERT/UPDATE/DELETE policies → blocked for all authenticated users)

-- =============================================================
-- ROLE PERMISSIONS
-- Read: any org member
-- Write: System Admin only
-- =============================================================

CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_id
        AND (r.organisation_id IS NULL OR r.organisation_id = get_my_organisation_id())
    )
  );

CREATE POLICY "role_permissions_insert" ON role_permissions FOR INSERT
  WITH CHECK (
    is_system_admin()
    AND EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_id
        AND r.organisation_id = get_my_organisation_id()
        AND r.is_system_role  = false
    )
  );

CREATE POLICY "role_permissions_delete" ON role_permissions FOR DELETE
  USING (
    is_system_admin()
    AND EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_id
        AND r.organisation_id = get_my_organisation_id()
        AND r.is_system_role  = false
    )
  );

-- =============================================================
-- USER PROFILES
-- Workers: see own profile only
-- Supervisor: see profiles in their org
-- HSE Officer / Admin: full org access
-- Executive: read only across org
-- =============================================================

CREATE POLICY "up_select_own" ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "up_select_elevated" ON user_profiles FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_executive())
  );

CREATE POLICY "up_insert" ON user_profiles FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- Users can update their own non-sensitive fields;
-- admins/hse officers can update any profile in their org.
CREATE POLICY "up_update_own" ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "up_update_elevated" ON user_profiles FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "up_delete" ON user_profiles FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- USER ROLES
-- Read: own roles + elevated roles for admin/hse
-- Write: System Admin only
-- =============================================================

CREATE POLICY "ur_select_own" ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ur_select_elevated" ON user_roles FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "ur_insert" ON user_roles FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "ur_update" ON user_roles FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "ur_delete" ON user_roles FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- USER SITE ASSIGNMENTS
-- Read: own assignments + admin/hse
-- Write: System Admin or HSE Officer
-- =============================================================

CREATE POLICY "usa_select_own" ON user_site_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "usa_select_elevated" ON user_site_assignments FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "usa_insert" ON user_site_assignments FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "usa_update" ON user_site_assignments FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "usa_delete" ON user_site_assignments FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- =============================================================
-- USER TEAM MEMBERSHIPS
-- Read: own memberships + supervisor/hse/admin
-- Write: Supervisor, HSE Officer, System Admin
-- =============================================================

CREATE POLICY "utm_select_own" ON user_team_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "utm_select_elevated" ON user_team_memberships FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "utm_insert" ON user_team_memberships FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "utm_update" ON user_team_memberships FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "utm_delete" ON user_team_memberships FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- =============================================================
-- DOCUMENTS
-- Read: org members who have the read permission (or elevated role)
-- Write: permission-gated
-- =============================================================

CREATE POLICY "docs_select" ON documents FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_system_admin()
      OR is_hse_officer()
      OR is_supervisor()
      OR is_executive()
      OR user_has_permission('documents', 'read')
    )
  );

CREATE POLICY "docs_insert" ON documents FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR user_has_permission('documents', 'create'))
  );

CREATE POLICY "docs_update" ON documents FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR user_has_permission('documents', 'update'))
  );

CREATE POLICY "docs_delete" ON documents FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR user_has_permission('documents', 'delete'))
  );

-- =============================================================
-- DOCUMENT VERSIONS
-- Inherit access from parent document
-- =============================================================

CREATE POLICY "docv_select" ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
        AND d.organisation_id = get_my_organisation_id()
        AND (
          is_system_admin()
          OR is_hse_officer()
          OR is_supervisor()
          OR is_executive()
          OR user_has_permission('documents', 'read')
        )
    )
  );

CREATE POLICY "docv_insert" ON document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
        AND d.organisation_id = get_my_organisation_id()
        AND (is_system_admin() OR is_hse_officer() OR user_has_permission('documents', 'update'))
    )
  );

-- Versions are immutable: no UPDATE or DELETE policies

-- =============================================================
-- AUDIT LOGS
-- Read: System Admin and HSE Officer only
-- Write: nobody (trigger-only via SECURITY DEFINER function)
-- =============================================================

CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER
-- trigger function can write to audit_logs.
