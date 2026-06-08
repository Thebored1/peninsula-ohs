-- =============================================================
-- HIRING MODULE: Permissions Seed
-- =============================================================

INSERT INTO permissions (module, action, description) VALUES
  ('hiring', 'create', 'Start a new hiring workflow'),
  ('hiring', 'read',   'View hires and hiring pipeline'),
  ('hiring', 'update', 'Edit and advance hiring workflow steps'),
  ('hiring', 'delete', 'Cancel or delete hires'),
  ('hiring', 'approve','Complete and approve a hire (creates worker profile)'),
  ('hr_templates', 'create', 'Create custom HR document templates'),
  ('hr_templates', 'read',   'View HR document templates'),
  ('hr_templates', 'update', 'Edit HR document templates'),
  ('onboarding', 'create', 'Create onboarding templates and assign onboarding plans'),
  ('onboarding', 'read',   'View onboarding plans and task completions'),
  ('onboarding', 'update', 'Mark onboarding tasks complete')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Wire permissions to roles ────────────────────────────────────────────────

-- Worker: can read hiring records assigned to them + complete own onboarding tasks
WITH worker_role AS (SELECT id FROM roles WHERE name = 'Worker' AND organisation_id IS NULL),
     worker_perms AS (
       SELECT id FROM permissions
       WHERE (module, action) IN (
         ('hiring',      'read'),
         ('onboarding',  'read'),
         ('onboarding',  'update')
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT wr.id, wp.id FROM worker_role wr, worker_perms wp
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Supervisor: can start hires, read/update all hiring steps
WITH supervisor_role AS (SELECT id FROM roles WHERE name = 'Supervisor' AND organisation_id IS NULL),
     supervisor_perms AS (
       SELECT id FROM permissions
       WHERE (module, action) IN (
         ('hiring',       'create'),
         ('hiring',       'read'),
         ('hiring',       'update'),
         ('hr_templates', 'read'),
         ('onboarding',   'create'),
         ('onboarding',   'read'),
         ('onboarding',   'update')
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT sr.id, sp.id FROM supervisor_role sr, supervisor_perms sp
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HSE Officer: full hiring + template + onboarding access
WITH hse_role AS (SELECT id FROM roles WHERE name = 'HSE Officer' AND organisation_id IS NULL),
     hse_perms AS (
       SELECT id FROM permissions
       WHERE module IN ('hiring', 'hr_templates', 'onboarding')
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT hr.id, hp.id FROM hse_role hr, hse_perms hp
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- System Admin: all hiring permissions
WITH admin_role AS (SELECT id FROM roles WHERE name = 'System Admin' AND organisation_id IS NULL),
     admin_perms AS (
       SELECT id FROM permissions
       WHERE module IN ('hiring', 'hr_templates', 'onboarding')
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT ar.id, ap.id FROM admin_role ar, admin_perms ap
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Executive: read-only access
WITH exec_role AS (SELECT id FROM roles WHERE name = 'Executive' AND organisation_id IS NULL),
     exec_perms AS (
       SELECT id FROM permissions
       WHERE (module, action) IN (
         ('hiring',      'read'),
         ('onboarding',  'read')
       )
     )
INSERT INTO role_permissions (role_id, permission_id)
SELECT er.id, ep.id FROM exec_role er, exec_perms ep
ON CONFLICT (role_id, permission_id) DO NOTHING;
