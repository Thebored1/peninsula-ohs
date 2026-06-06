-- =============================================================
-- MODULE 2: Seed Data — Auth, Session, and SSO Permissions
-- =============================================================
-- Extends the Module 1 permission table with new auth-specific
-- permissions, then wires them into the five system roles.
-- All inserts use ON CONFLICT DO NOTHING for idempotency.
-- =============================================================

-- =============================================================
-- NEW PERMISSIONS
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES

  -- Authentication event log
  ('auth_events', 'read',   'View authentication event log (logins, failures, logouts)'),
  ('auth_events', 'export', 'Export authentication event log to CSV'),

  -- Session management
  ('sessions', 'read',   'View active user sessions'),
  ('sessions', 'revoke', 'Force-revoke / logout user sessions'),

  -- SSO provider configuration
  ('sso', 'read',   'View SSO provider configurations'),
  ('sso', 'manage', 'Create, edit, and delete SSO provider configurations'),

  -- Row-level version history
  ('row_versions', 'read',   'View row-level version history for any record'),
  ('row_versions', 'export', 'Export row-level version history')

ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS (Module 2 additions)
-- Builds on the Module 1 mappings already in role_permissions.
-- =============================================================

WITH perm AS (
  SELECT id, module, action FROM permissions
),
role_ids AS (
  SELECT id, name FROM roles WHERE is_system_role = true
),

-- ---- WORKER ---------------------------------------------------
-- No new permissions. Workers cannot see auth logs or sessions
-- beyond their own (that access is handled by RLS on auth_events
-- and user_sessions, not permission checks).
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      -- no new auth/session/sso/version permissions for workers
      ('auth_events', 'read')   -- own events only (enforced by RLS)
    )
),

-- ---- SUPERVISOR -----------------------------------------------
-- Can view their own auth events and sessions (RLS gates the data).
-- No session-revocation or SSO management.
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('auth_events', 'read'),
      ('sessions',    'read')
    )
),

-- ---- HSE OFFICER ---------------------------------------------
-- Full read access to auth events, sessions, and version history.
-- Can export but cannot configure SSO (that is admin-only).
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('auth_events',  'read'),
      ('auth_events',  'export'),
      ('sessions',     'read'),
      ('sessions',     'revoke'),
      ('row_versions', 'read'),
      ('row_versions', 'export')
    )
),

-- ---- EXECUTIVE -----------------------------------------------
-- Read-only view of auth events (for oversight / compliance).
-- Cannot see individual session details or version history.
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('auth_events', 'read')
    )
),

-- ---- SYSTEM ADMIN --------------------------------------------
-- All permissions including SSO management and version history.
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
    AND (p.module, p.action) IN (
      ('auth_events',  'read'),
      ('auth_events',  'export'),
      ('sessions',     'read'),
      ('sessions',     'revoke'),
      ('sso',          'read'),
      ('sso',          'manage'),
      ('row_versions', 'read'),
      ('row_versions', 'export')
    )
),

all_mappings AS (
  SELECT * FROM worker_perms
  UNION ALL SELECT * FROM supervisor_perms
  UNION ALL SELECT * FROM hse_perms
  UNION ALL SELECT * FROM executive_perms
  UNION ALL SELECT * FROM system_admin_perms
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, perm_id FROM all_mappings
ON CONFLICT (role_id, permission_id) DO NOTHING;
