-- =============================================================
-- MODULE 1: Seed Data — Built-in Roles & Permissions
-- =============================================================
-- These are system-level records (organisation_id IS NULL).
-- Every organisation inherits them automatically.
-- Custom org-level roles are created at runtime via the API.
-- =============================================================

-- =============================================================
-- BUILT-IN ROLES
-- =============================================================

INSERT INTO roles (id, organisation_id, name, description, is_system_role) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Worker',
   'Can report incidents, view own records, complete assigned tasks.',
   true),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Supervisor',
   'Can review team reports, assign corrective actions, approve work permits.',
   true),
  ('00000000-0000-0000-0000-000000000003', NULL, 'HSE Officer',
   'Full access to safety data across all assigned sites.',
   true),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Executive',
   'Read-only access to dashboards and reports across the organisation.',
   true),
  ('00000000-0000-0000-0000-000000000005', NULL, 'System Admin',
   'Full platform configuration access including user and role management.',
   true)
ON CONFLICT (organisation_id, name) DO NOTHING;

-- =============================================================
-- PERMISSIONS
-- Covers Module 1 and stubs for all future OHS modules
-- so roles can be pre-wired before those modules are built.
-- Format: (module, action, description)
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES
  -- Organisation management
  ('organisations', 'read',   'View organisation profile'),
  ('organisations', 'update', 'Edit organisation profile and settings'),

  -- Site management
  ('sites', 'create', 'Create new sites'),
  ('sites', 'read',   'View sites'),
  ('sites', 'update', 'Edit site details'),
  ('sites', 'delete', 'Deactivate or delete sites'),

  -- Department management
  ('departments', 'create', 'Create new departments'),
  ('departments', 'read',   'View departments'),
  ('departments', 'update', 'Edit department details'),
  ('departments', 'delete', 'Deactivate or delete departments'),

  -- Work area management
  ('work_areas', 'create', 'Create new work areas'),
  ('work_areas', 'read',   'View work areas'),
  ('work_areas', 'update', 'Edit work area details'),
  ('work_areas', 'delete', 'Deactivate or delete work areas'),

  -- Team management
  ('teams', 'create', 'Create new teams'),
  ('teams', 'read',   'View teams'),
  ('teams', 'update', 'Edit team details'),
  ('teams', 'delete', 'Deactivate or delete teams'),

  -- User management
  ('users', 'create', 'Create and invite new users'),
  ('users', 'read',   'View user profiles'),
  ('users', 'update', 'Edit user profiles and assignments'),
  ('users', 'delete', 'Deactivate or delete users'),
  ('users', 'import', 'Bulk import users via CSV'),
  ('users', 'export', 'Export user list to CSV'),

  -- Role management
  ('roles', 'create', 'Create custom roles'),
  ('roles', 'read',   'View roles and their permissions'),
  ('roles', 'update', 'Edit custom role permissions'),
  ('roles', 'delete', 'Delete custom roles'),

  -- Document management
  ('documents', 'create', 'Upload new documents'),
  ('documents', 'read',   'View and download documents'),
  ('documents', 'update', 'Upload new document versions'),
  ('documents', 'delete', 'Archive or delete documents'),
  ('documents', 'export', 'Export document register'),

  -- Audit logs
  ('audit_logs', 'read',   'View audit trail'),
  ('audit_logs', 'export', 'Export audit logs'),

  -- ---- Future modules (stubs) --------------------------------

  -- Incident management
  ('incidents', 'create',   'Report a new incident'),
  ('incidents', 'read',     'View incidents'),
  ('incidents', 'update',   'Edit incident records'),
  ('incidents', 'delete',   'Delete incident records'),
  ('incidents', 'approve',  'Approve or close incidents'),
  ('incidents', 'assign',   'Assign corrective actions'),
  ('incidents', 'export',   'Export incident data'),

  -- Inspection management
  ('inspections', 'create',  'Create and conduct inspections'),
  ('inspections', 'read',    'View inspection records'),
  ('inspections', 'update',  'Edit inspection records'),
  ('inspections', 'delete',  'Delete inspection records'),
  ('inspections', 'approve', 'Approve inspection findings'),
  ('inspections', 'export',  'Export inspection data'),

  -- Risk management
  ('risks', 'create',  'Create risk assessments'),
  ('risks', 'read',    'View risk register'),
  ('risks', 'update',  'Edit risk records'),
  ('risks', 'delete',  'Delete risk records'),
  ('risks', 'approve', 'Approve risk assessments'),
  ('risks', 'export',  'Export risk register'),

  -- Permit to work
  ('permits', 'create',  'Create work permits'),
  ('permits', 'read',    'View permits'),
  ('permits', 'update',  'Edit permits'),
  ('permits', 'delete',  'Delete permits'),
  ('permits', 'approve', 'Approve / issue permits'),
  ('permits', 'export',  'Export permit data'),

  -- Training & competency
  ('training', 'create', 'Create training records'),
  ('training', 'read',   'View training records'),
  ('training', 'update', 'Edit training records'),
  ('training', 'delete', 'Delete training records'),
  ('training', 'assign', 'Assign training to users'),
  ('training', 'export', 'Export training data'),

  -- Reporting & dashboards
  ('reports',   'read',   'View and generate reports'),
  ('reports',   'export', 'Export reports'),
  ('dashboard', 'read',   'Access executive and operational dashboards')

ON CONFLICT (module, action) DO NOTHING;

-- =============================================================
-- ROLE → PERMISSION MAPPINGS
-- Using CTEs for readability. Each role gets the permissions
-- that match its description above.
-- =============================================================

-- Helper: resolve permission IDs by (module, action)
WITH perm AS (
  SELECT id, module, action FROM permissions
),
role_ids AS (
  SELECT id, name FROM roles WHERE is_system_role = true
),

-- ---- WORKER -------------------------------------------------
-- Can report incidents, view own records, complete assigned tasks
worker_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Worker'
    AND (p.module, p.action) IN (
      ('organisations',  'read'),
      ('sites',          'read'),
      ('departments',    'read'),
      ('work_areas',     'read'),
      ('teams',          'read'),
      ('users',          'read'),
      ('documents',      'read'),
      ('incidents',      'create'),
      ('incidents',      'read'),
      ('inspections',    'read'),
      ('risks',          'read'),
      ('permits',        'read'),
      ('training',       'read'),
      ('dashboard',      'read')
    )
),

-- ---- SUPERVISOR ---------------------------------------------
-- Review team reports, assign actions, approve permits
supervisor_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Supervisor'
    AND (p.module, p.action) IN (
      ('organisations',  'read'),
      ('sites',          'read'),
      ('departments',    'read'),
      ('work_areas',     'read'),
      ('work_areas',     'create'),
      ('work_areas',     'update'),
      ('teams',          'read'),
      ('teams',          'create'),
      ('teams',          'update'),
      ('users',          'read'),
      ('documents',      'read'),
      ('documents',      'create'),
      ('documents',      'update'),
      ('incidents',      'create'),
      ('incidents',      'read'),
      ('incidents',      'update'),
      ('incidents',      'assign'),
      ('inspections',    'create'),
      ('inspections',    'read'),
      ('inspections',    'update'),
      ('inspections',    'approve'),
      ('risks',          'read'),
      ('permits',        'create'),
      ('permits',        'read'),
      ('permits',        'approve'),
      ('training',       'read'),
      ('training',       'assign'),
      ('dashboard',      'read'),
      ('reports',        'read')
    )
),

-- ---- HSE OFFICER -------------------------------------------
-- Full access to safety data across their sites
hse_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'HSE Officer'
    AND (p.module, p.action) IN (
      ('organisations',  'read'),
      ('sites',          'read'),
      ('sites',          'create'),
      ('sites',          'update'),
      ('departments',    'read'),
      ('departments',    'create'),
      ('departments',    'update'),
      ('work_areas',     'read'),
      ('work_areas',     'create'),
      ('work_areas',     'update'),
      ('work_areas',     'delete'),
      ('teams',          'read'),
      ('teams',          'create'),
      ('teams',          'update'),
      ('teams',          'delete'),
      ('users',          'read'),
      ('users',          'create'),
      ('users',          'update'),
      ('users',          'import'),
      ('users',          'export'),
      ('roles',          'read'),
      ('documents',      'read'),
      ('documents',      'create'),
      ('documents',      'update'),
      ('documents',      'delete'),
      ('documents',      'export'),
      ('audit_logs',     'read'),
      ('audit_logs',     'export'),
      ('incidents',      'create'),
      ('incidents',      'read'),
      ('incidents',      'update'),
      ('incidents',      'delete'),
      ('incidents',      'approve'),
      ('incidents',      'assign'),
      ('incidents',      'export'),
      ('inspections',    'create'),
      ('inspections',    'read'),
      ('inspections',    'update'),
      ('inspections',    'delete'),
      ('inspections',    'approve'),
      ('inspections',    'export'),
      ('risks',          'create'),
      ('risks',          'read'),
      ('risks',          'update'),
      ('risks',          'delete'),
      ('risks',          'approve'),
      ('risks',          'export'),
      ('permits',        'create'),
      ('permits',        'read'),
      ('permits',        'update'),
      ('permits',        'delete'),
      ('permits',        'approve'),
      ('permits',        'export'),
      ('training',       'create'),
      ('training',       'read'),
      ('training',       'update'),
      ('training',       'delete'),
      ('training',       'assign'),
      ('training',       'export'),
      ('dashboard',      'read'),
      ('reports',        'read'),
      ('reports',        'export')
    )
),

-- ---- EXECUTIVE ---------------------------------------------
-- Read-only dashboard and reports
executive_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'Executive'
    AND (p.module, p.action) IN (
      ('organisations',  'read'),
      ('sites',          'read'),
      ('departments',    'read'),
      ('work_areas',     'read'),
      ('teams',          'read'),
      ('users',          'read'),
      ('documents',      'read'),
      ('incidents',      'read'),
      ('inspections',    'read'),
      ('risks',          'read'),
      ('permits',        'read'),
      ('training',       'read'),
      ('dashboard',      'read'),
      ('reports',        'read'),
      ('reports',        'export')
    )
),

-- ---- SYSTEM ADMIN ------------------------------------------
-- Full platform configuration access — every permission
system_admin_perms AS (
  SELECT r.id AS role_id, p.id AS perm_id
  FROM role_ids r, perm p
  WHERE r.name = 'System Admin'
),

all_mappings AS (
  SELECT * FROM worker_perms
  UNION ALL
  SELECT * FROM supervisor_perms
  UNION ALL
  SELECT * FROM hse_perms
  UNION ALL
  SELECT * FROM executive_perms
  UNION ALL
  SELECT * FROM system_admin_perms
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, perm_id FROM all_mappings
ON CONFLICT (role_id, permission_id) DO NOTHING;
