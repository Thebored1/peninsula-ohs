-- =============================================================
-- MODULE 1: Organisation & User Management — Core Schema
-- =============================================================

-- Extensions (already available in Supabase, but explicit is safe)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE employment_type_enum AS ENUM (
  'full_time',
  'part_time',
  'contractor',
  'casual',
  'volunteer'
);

CREATE TYPE audit_action_enum AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE'
);

-- =============================================================
-- ORGANISATIONS
-- Top-level tenant. Every other record belongs to one.
-- =============================================================

CREATE TABLE organisations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        UNIQUE,                        -- URL-friendly identifier
  logo_url        text,
  industry        text,
  timezone        text        NOT NULL DEFAULT 'UTC',
  address         jsonb,                                     -- {street, suburb, city, state, postcode, country}
  contact_email   text,
  contact_phone   text,
  subscription_plan text      DEFAULT 'trial',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- SITES
-- Physical locations within an organisation.
-- =============================================================

CREATE TABLE sites (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  code            text,                                      -- short identifier e.g. "SYD-WH"
  site_type       text,                                      -- 'warehouse','office','factory','construction'
  address         jsonb,
  timezone        text,
  geo_coordinates jsonb,                                     -- {lat, lng}
  emergency_contacts jsonb,                                  -- [{name, role, phone}]
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (organisation_id, code)
);

-- =============================================================
-- DEPARTMENTS
-- Divisions within a site.
-- =============================================================

CREATE TABLE departments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id         uuid        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  code            text,
  description     text,
  manager_id      uuid,                                      -- FK added after user_profiles exists
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (site_id, code)
);

-- =============================================================
-- WORK AREAS
-- Geo-tagged zones within a department. Everything in OHS
-- links back to a work area for location context.
-- =============================================================

CREATE TABLE work_areas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id         uuid        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  department_id   uuid        NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  code            text,
  description     text,
  location_details text,                                     -- "Building A, Level 2, North Wing"
  geo_coordinates jsonb,                                     -- {lat, lng}
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (department_id, code)
);

-- =============================================================
-- TEAMS
-- Groups of workers within a department / work area.
-- =============================================================

CREATE TABLE teams (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  department_id   uuid        NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  work_area_id    uuid        REFERENCES work_areas(id),
  name            text        NOT NULL,
  description     text,
  team_lead_id    uuid,                                      -- FK added after user_profiles exists
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- ROLES
-- Built-in system roles (organisation_id IS NULL) and
-- custom per-organisation roles.
-- =============================================================

CREATE TABLE roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES organisations(id) ON DELETE CASCADE,  -- NULL = system role
  name            text        NOT NULL,
  description     text,
  is_system_role  boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (organisation_id, name)
);

-- =============================================================
-- PERMISSIONS
-- Granular module × action pairs.
-- =============================================================

CREATE TABLE permissions (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  module      text  NOT NULL,   -- 'users', 'sites', 'incidents', ...
  action      text  NOT NULL,   -- 'create', 'read', 'update', 'delete', 'approve', ...
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, action)
);

-- =============================================================
-- ROLE PERMISSIONS
-- =============================================================

CREATE TABLE role_permissions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       uuid        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id),
  UNIQUE (role_id, permission_id)
);

-- =============================================================
-- USER PROFILES
-- Extends auth.users with OHS-specific fields.
-- =============================================================

CREATE TABLE user_profiles (
  id                    uuid                  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id       uuid                  NOT NULL REFERENCES organisations(id),
  employee_id           text,                                -- internal payroll/HR number
  first_name            text                  NOT NULL,
  last_name             text                  NOT NULL,
  display_name          text                  GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email                 text                  NOT NULL,
  phone                 text,
  mobile                text,
  avatar_url            text,
  employment_type       employment_type_enum,
  primary_site_id       uuid                  REFERENCES sites(id),
  primary_department_id uuid                  REFERENCES departments(id),
  primary_team_id       uuid                  REFERENCES teams(id),
  job_title             text,
  date_of_birth         date,
  hire_date             date,
  emergency_contact     jsonb,                               -- {name, relationship, phone}
  notes                 text,
  is_active             boolean               NOT NULL DEFAULT true,
  last_login_at         timestamptz,
  created_at            timestamptz           NOT NULL DEFAULT now(),
  updated_at            timestamptz           NOT NULL DEFAULT now(),
  created_by            uuid                  REFERENCES auth.users(id),
  UNIQUE (organisation_id, employee_id)
);

-- Deferred FK: departments.manager_id → user_profiles
ALTER TABLE departments
  ADD CONSTRAINT fk_department_manager
  FOREIGN KEY (manager_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Deferred FK: teams.team_lead_id → user_profiles
ALTER TABLE teams
  ADD CONSTRAINT fk_team_lead
  FOREIGN KEY (team_lead_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- =============================================================
-- USER ROLES
-- Assigns roles to users, optionally scoped to a site.
-- =============================================================

CREATE TABLE user_roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id         uuid        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  site_id         uuid        REFERENCES sites(id),          -- NULL = org-wide scope
  granted_at      timestamptz NOT NULL DEFAULT now(),
  granted_by      uuid        REFERENCES auth.users(id),
  expires_at      timestamptz,
  is_active       boolean     NOT NULL DEFAULT true,
  UNIQUE (user_id, role_id, organisation_id, site_id)
);

-- =============================================================
-- USER SITE ASSIGNMENTS
-- Which sites a user can access (beyond their primary site).
-- =============================================================

CREATE TABLE user_site_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id         uuid        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  is_primary      boolean     NOT NULL DEFAULT false,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  assigned_by     uuid        REFERENCES auth.users(id),
  UNIQUE (user_id, site_id)
);

-- =============================================================
-- USER TEAM MEMBERSHIPS
-- =============================================================

CREATE TABLE user_team_memberships (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id         uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  added_by        uuid        REFERENCES auth.users(id),
  is_active       boolean     NOT NULL DEFAULT true,
  UNIQUE (user_id, team_id)
);

-- =============================================================
-- DOCUMENTS
-- Centralised file metadata. Actual files in Supabase Storage.
-- =============================================================

CREATE TABLE documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  site_id          uuid        REFERENCES sites(id),
  department_id    uuid        REFERENCES departments(id),
  name             text        NOT NULL,
  description      text,
  category         text,                                     -- 'policy','procedure','form','certificate','report'
  tags             text[],
  storage_path     text        NOT NULL,                     -- Supabase Storage object path
  file_name        text        NOT NULL,
  file_size        bigint,
  mime_type        text,
  current_version  integer     NOT NULL DEFAULT 1,
  retention_policy text        NOT NULL DEFAULT 'permanent', -- 'permanent','1_year','3_years','7_years','custom'
  retention_expires_at timestamptz,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- DOCUMENT VERSIONS
-- Full version history for every document.
-- =============================================================

CREATE TABLE document_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number integer     NOT NULL,
  storage_path   text        NOT NULL,
  file_name      text        NOT NULL,
  file_size      bigint,
  mime_type      text,
  change_notes   text,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  uploaded_by    uuid        REFERENCES auth.users(id),
  UNIQUE (document_id, version_number)
);

-- =============================================================
-- AUDIT LOGS
-- Append-only. Every field change on every audited table.
-- =============================================================

CREATE TABLE audit_logs (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid,
  table_name     text             NOT NULL,
  record_id      text             NOT NULL,
  action         audit_action_enum NOT NULL,
  old_data       jsonb,                                      -- full row before change
  new_data       jsonb,                                      -- full row after change
  changed_fields jsonb,                                      -- {field: {from: x, to: y}} for UPDATEs
  changed_by     uuid             REFERENCES auth.users(id),
  changed_by_email text,                                     -- denormalised; survives user deletion
  ip_address     text,
  user_agent     text,
  request_id     text,
  created_at     timestamptz      NOT NULL DEFAULT now()
);

-- Enforce append-only: deny updates and deletes on audit_logs
CREATE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- =============================================================
-- INDEXES
-- =============================================================

-- organisations
CREATE INDEX idx_orgs_is_active        ON organisations(is_active);
CREATE INDEX idx_orgs_slug             ON organisations(slug);

-- sites
CREATE INDEX idx_sites_org_id          ON sites(organisation_id);
CREATE INDEX idx_sites_is_active       ON sites(organisation_id, is_active);

-- departments
CREATE INDEX idx_depts_site_id         ON departments(site_id);
CREATE INDEX idx_depts_org_id          ON departments(organisation_id);

-- work_areas
CREATE INDEX idx_work_areas_dept_id    ON work_areas(department_id);
CREATE INDEX idx_work_areas_site_id    ON work_areas(site_id);

-- teams
CREATE INDEX idx_teams_dept_id         ON teams(department_id);
CREATE INDEX idx_teams_org_id          ON teams(organisation_id);

-- user_profiles
CREATE INDEX idx_up_org_id             ON user_profiles(organisation_id);
CREATE INDEX idx_up_primary_site       ON user_profiles(primary_site_id);
CREATE INDEX idx_up_is_active          ON user_profiles(organisation_id, is_active);
CREATE INDEX idx_up_display_name       ON user_profiles USING gin(to_tsvector('simple', display_name));
CREATE INDEX idx_up_email              ON user_profiles(email);

-- user_roles
CREATE INDEX idx_ur_user_id            ON user_roles(user_id);
CREATE INDEX idx_ur_role_id            ON user_roles(role_id);
CREATE INDEX idx_ur_org_id             ON user_roles(organisation_id);

-- user_site_assignments
CREATE INDEX idx_usa_user_id           ON user_site_assignments(user_id);
CREATE INDEX idx_usa_site_id           ON user_site_assignments(site_id);

-- user_team_memberships
CREATE INDEX idx_utm_user_id           ON user_team_memberships(user_id);
CREATE INDEX idx_utm_team_id           ON user_team_memberships(team_id);

-- documents
CREATE INDEX idx_docs_org_id           ON documents(organisation_id);
CREATE INDEX idx_docs_site_id          ON documents(site_id);
CREATE INDEX idx_docs_category         ON documents(category);
CREATE INDEX idx_docs_tags             ON documents USING GIN(tags);

-- audit_logs
CREATE INDEX idx_al_table_record       ON audit_logs(table_name, record_id);
CREATE INDEX idx_al_changed_by         ON audit_logs(changed_by);
CREATE INDEX idx_al_org_id             ON audit_logs(organisation_id);
CREATE INDEX idx_al_created_at         ON audit_logs(created_at DESC);
CREATE INDEX idx_al_action             ON audit_logs(action);
