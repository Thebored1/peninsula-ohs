-- =============================================================
-- MODULE 15: Environmental Monitoring — Schema
-- =============================================================
-- Tracks environmental measurements (air, noise, water, waste,
-- emissions), regulatory limits, and report submission cycles.
-- All measurement parameter types, units, and waste categories
-- are lookup tables.
--
-- Tables (8):
--   env_parameter_types       — lookup: air_quality, noise, water, etc.
--   env_measurement_units     — lookup: dB, mg/L, ppm, NTU, etc.
--   env_monitoring_stations   — named measurement points on a site
--   env_monitoring_records    — individual readings at a station
--   env_compliance_limits     — regulatory thresholds per parameter per site
--   waste_categories          — lookup: general, hazardous, liquid, etc.
--   waste_management_logs     — waste generation and disposal records
--   env_reporting_requirements — recurring regulatory reporting obligations
--   env_report_submissions    — actual submitted reports to regulators
-- =============================================================

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

-- monitoring_category groups related parameters on the dashboard
CREATE TABLE env_parameter_types (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text        NOT NULL UNIQUE,
  name                text        NOT NULL,
  description         text,
  monitoring_category text        NOT NULL DEFAULT 'general'
                                  CHECK (monitoring_category IN (
                                    'air_quality','noise','water_quality',
                                    'soil','emissions','waste','other'
                                  )),
  default_unit_code   text,       -- hint for the UI
  icon                text,
  display_order       integer     NOT NULL DEFAULT 0,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE env_measurement_units (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,  -- 'dB', 'mg/m3', 'NTU', 'pH'
  name          text        NOT NULL,
  symbol        text        NOT NULL,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true
);

CREATE TABLE waste_categories (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text        NOT NULL UNIQUE,
  name                  text        NOT NULL,
  description           text,
  is_hazardous          boolean     NOT NULL DEFAULT false,
  requires_manifest     boolean     NOT NULL DEFAULT false,  -- regulatory waste manifest
  disposal_instructions text,
  icon                  text,
  display_order         integer     NOT NULL DEFAULT 0,
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- MONITORING STATIONS
-- A named, physical measurement point on a site.
-- Can be a fixed sensor location or a periodic sampling point.
-- =============================================================

CREATE TABLE env_monitoring_stations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  site_id          uuid        NOT NULL REFERENCES sites(id),
  work_area_id     uuid        REFERENCES work_areas(id),
  name             text        NOT NULL,
  station_code     text,           -- e.g. 'AMS-01', 'NM-BOUNDARY-N'
  description      text,
  location_details text,           -- GPS coordinates or narrative description
  station_type     text        NOT NULL DEFAULT 'manual'
                               CHECK (station_type IN ('manual','automated','periodic')),
  -- Parameters this station measures (informational)
  parameter_type_ids uuid[]    NOT NULL DEFAULT '{}',
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- ENVIRONMENTAL MONITORING RECORDS
-- One row per measurement reading. Supports manual entry and
-- bulk import from automated sensors.
-- exceeds_limit is set by trigger comparing against
-- env_compliance_limits.
-- =============================================================

CREATE TABLE env_monitoring_records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id          uuid        REFERENCES env_monitoring_stations(id) ON DELETE SET NULL,
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  site_id             uuid        REFERENCES sites(id),
  parameter_type_id   uuid        NOT NULL REFERENCES env_parameter_types(id),
  unit_id             uuid        REFERENCES env_measurement_units(id),

  measured_value      decimal(18,6) NOT NULL,
  measured_at         timestamptz NOT NULL,
  measurement_method  text,       -- 'manual','automated','laboratory'
  instrument_id       text,       -- reference to the instrument/sensor used
  weather_conditions  text,

  exceeds_limit       boolean     NOT NULL DEFAULT false,
  limit_reference     text,       -- which regulation/licence condition was exceeded
  investigation_required boolean  NOT NULL DEFAULT false,
  corrective_action   text,

  -- Link to incident if this reading prompted one
  incident_id         uuid        REFERENCES incidents(id) ON DELETE SET NULL,

  recorded_by         uuid        REFERENCES auth.users(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- ENVIRONMENTAL COMPLIANCE LIMITS
-- The regulatory or licence thresholds for each parameter at
-- each site. Used by the trigger to flag exceedances.
-- =============================================================

CREATE TABLE env_compliance_limits (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  site_id           uuid        REFERENCES sites(id),
  parameter_type_id uuid        NOT NULL REFERENCES env_parameter_types(id),
  unit_id           uuid        REFERENCES env_measurement_units(id),
  limit_type        text        NOT NULL DEFAULT 'maximum'
                                CHECK (limit_type IN ('maximum','minimum','target','average')),
  limit_value       decimal(18,6) NOT NULL,
  averaging_period  text,        -- e.g. '1 hour', '24 hours', '8 hours'
  regulatory_reference text,     -- licence condition, act/regulation
  jurisdiction      text,
  effective_from    date,
  effective_to      date,
  is_active         boolean     NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- WASTE MANAGEMENT LOGS
-- Records of waste generated and disposed.
-- manifest_number is required for hazardous waste.
-- =============================================================

CREATE TABLE waste_management_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  site_id           uuid        REFERENCES sites(id),
  waste_category_id uuid        NOT NULL REFERENCES waste_categories(id),
  quantity          decimal(12,4) NOT NULL,
  unit              text        NOT NULL,   -- 'kg', 'L', 'tonnes', 'm3'
  description       text,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  generated_by      uuid        REFERENCES auth.users(id),
  storage_location  text,
  disposal_method   text,
  waste_contractor  text,
  manifest_number   text,
  disposal_date     date,
  disposal_cost     decimal(10,2),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- ENVIRONMENTAL REPORTING REQUIREMENTS
-- Recurring reporting obligations (e.g. monthly water quality
-- report to EPA, quarterly noise monitoring).
-- =============================================================

CREATE TABLE env_reporting_requirements (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id),
  site_id           uuid        REFERENCES sites(id),
  name              text        NOT NULL,
  description       text,
  regulatory_body   text        NOT NULL,
  report_type       text        NOT NULL,     -- 'monthly_discharge','quarterly_noise', etc.
  frequency         text        NOT NULL
                                CHECK (frequency IN ('weekly','monthly','quarterly','biannual','annual','ad_hoc')),
  next_due_date     date,
  last_submitted_at date,
  responsible_person_id uuid    REFERENCES auth.users(id),
  reminder_days     integer     NOT NULL DEFAULT 14,  -- notify this many days before due
  is_active         boolean     NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- ENVIRONMENTAL REPORT SUBMISSIONS
-- Actual report files submitted against a requirement.
-- =============================================================

CREATE TABLE env_report_submissions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id          uuid        NOT NULL REFERENCES env_reporting_requirements(id),
  organisation_id         uuid        NOT NULL REFERENCES organisations(id),
  reporting_period_start  date        NOT NULL,
  reporting_period_end    date        NOT NULL,
  submitted_at            timestamptz,
  submitted_by            uuid        REFERENCES auth.users(id),
  submission_method       text,       -- 'online_portal', 'email', 'post'
  reference_number        text,       -- regulator-assigned reference
  storage_path            text,       -- file in Supabase Storage
  document_id             uuid        REFERENCES documents(id) ON DELETE SET NULL,
  status                  text        NOT NULL DEFAULT 'draft'
                                      CHECK (status IN ('draft','submitted','acknowledged','overdue')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_ems_site_id          ON env_monitoring_stations(site_id);
CREATE INDEX idx_emr_station_id       ON env_monitoring_records(station_id, measured_at DESC);
CREATE INDEX idx_emr_parameter        ON env_monitoring_records(parameter_type_id, measured_at DESC);
CREATE INDEX idx_emr_site_id          ON env_monitoring_records(site_id, measured_at DESC);
CREATE INDEX idx_emr_exceeds          ON env_monitoring_records(organisation_id) WHERE exceeds_limit = true;
CREATE INDEX idx_ecl_site_param       ON env_compliance_limits(site_id, parameter_type_id) WHERE is_active = true;
CREATE INDEX idx_wml_site_id          ON waste_management_logs(site_id, generated_at DESC);
CREATE INDEX idx_wml_category         ON waste_management_logs(waste_category_id);
CREATE INDEX idx_err_org_due          ON env_reporting_requirements(organisation_id, next_due_date) WHERE is_active = true;
CREATE INDEX idx_ers_requirement      ON env_report_submissions(requirement_id, reporting_period_end DESC);
