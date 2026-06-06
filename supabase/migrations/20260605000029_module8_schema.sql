-- =============================================================
-- MODULE 8: Asset Management — Core Schema
-- =============================================================
-- Design: every field that "might change" uses a lookup table.
-- Status, asset type, maintenance type are all first-class tables.
--
-- Tables (9 new + 2 ALTER):
--   asset_types              — lookup: machinery, vehicle, tool, etc.
--   asset_statuses           — lookup: operational, out_of_service, etc.
--   maintenance_types        — lookup: preventive, corrective, calibration, etc.
--   assets                   — the asset register entry
--   asset_out_of_service_events — log of every OOS flagging
--   asset_maintenance_records   — maintenance / service history
--   asset_maintenance_parts  — parts used in each maintenance record
--   asset_documents          — links assets to documents (Module 1/10)
--   asset_incident_links     — links assets to incidents (Module 4)
--
--   ALTER inspection_schedules ADD asset_id
--   ALTER inspections          ADD asset_id
-- =============================================================

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

CREATE TABLE asset_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- is_operational: when false, the asset cannot be actively assigned/used.
-- Drives the "locked from use" logic without hard-coding status names.
CREATE TABLE asset_statuses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  description     text,
  colour_code     text        NOT NULL DEFAULT '#6b7280',
  is_operational  boolean     NOT NULL DEFAULT true,
  display_order   integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- is_preventive: drives scheduling logic (preventive = schedule-driven)
CREATE TABLE maintenance_types (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text        NOT NULL UNIQUE,
  name           text        NOT NULL,
  description    text,
  is_preventive  boolean     NOT NULL DEFAULT false,
  display_order  integer     NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- ASSETS
-- asset_number: ASSET-YYYY-NNNNN (auto-generated)
-- qr_code_data: encoded string embedded in the QR image.
--   Typically the asset UUID or a URL to the asset page.
-- linked_inspection_template_id: scanning the QR pre-fills
--   the inspection form with this template.
-- =============================================================

CREATE TABLE assets (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             uuid        NOT NULL REFERENCES organisations(id),
  site_id                     uuid        REFERENCES sites(id),
  department_id               uuid        REFERENCES departments(id),
  work_area_id                uuid        REFERENCES work_areas(id),

  -- Identity
  asset_number                text        UNIQUE,          -- ASSET-2026-00001
  name                        text        NOT NULL,
  description                 text,
  asset_type_id               uuid        NOT NULL REFERENCES asset_types(id),
  serial_number               text,
  asset_tag                   text,                        -- internal barcode / RFID
  qr_code_data                text,                        -- encoded payload for QR generation

  -- Make / Model
  manufacturer                text,
  model                       text,
  year_of_manufacture         integer,

  -- Status
  status_id                   uuid        NOT NULL REFERENCES asset_statuses(id),

  -- Location & assignment
  location_details            text,                        -- specific spot within work_area
  assigned_operator_id        uuid        REFERENCES auth.users(id),

  -- Commercial
  purchase_date               date,
  warranty_expiry_date        date,
  replacement_cost            decimal(12,2),

  -- Inspection
  linked_inspection_template_id uuid      REFERENCES inspection_templates(id) ON DELETE SET NULL,
  inspection_frequency        text        CHECK (inspection_frequency IN ('daily','weekly','monthly','quarterly','annually','as_required')),
  next_inspection_due         date,
  last_inspected_at           date,

  -- Maintenance
  next_maintenance_due        date,
  last_maintained_at          date,

  is_active                   boolean     NOT NULL DEFAULT true,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  created_by                  uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- ASSET OUT-OF-SERVICE EVENTS
-- Append-only log. returned_to_service_* filled when resolved.
-- =============================================================

CREATE TABLE asset_out_of_service_events (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                 uuid        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organisation_id          uuid        NOT NULL REFERENCES organisations(id),
  put_out_of_service_by    uuid        REFERENCES auth.users(id),
  put_out_of_service_at    timestamptz NOT NULL DEFAULT now(),
  reason                   text        NOT NULL,
  returned_to_service_by   uuid        REFERENCES auth.users(id),
  returned_to_service_at   timestamptz,
  resolution_notes         text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- ASSET MAINTENANCE RECORDS
-- maintenance_number: MAINT-YYYY-NNNNN
-- =============================================================

CREATE TABLE asset_maintenance_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  maintenance_number    text        UNIQUE,        -- MAINT-2026-00001
  maintenance_type_id   uuid        NOT NULL REFERENCES maintenance_types(id),

  -- Who did the work
  performed_by_user_id  uuid        REFERENCES auth.users(id),
  performed_by_name     text,                      -- external contractor / vendor name
  contractor_company    text,

  -- Timing
  performed_at          timestamptz NOT NULL,
  next_maintenance_due  date,
  duration_hours        decimal(6,2),

  -- Findings & work done
  description           text        NOT NULL,
  findings              text,
  parts_cost            decimal(10,2),
  labour_cost           decimal(10,2),
  total_cost            decimal(10,2),

  -- Linked action (Module 5)
  action_id             uuid        REFERENCES actions(id) ON DELETE SET NULL,

  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- ASSET MAINTENANCE PARTS
-- Parts / consumables used in a maintenance job.
-- =============================================================

CREATE TABLE asset_maintenance_parts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_record_id uuid        NOT NULL REFERENCES asset_maintenance_records(id) ON DELETE CASCADE,
  asset_id              uuid        NOT NULL REFERENCES assets(id),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  part_name             text        NOT NULL,
  part_number           text,
  quantity              decimal(10,3) NOT NULL DEFAULT 1,
  unit                  text,
  unit_cost             decimal(10,2),
  supplier              text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- ASSET DOCUMENTS
-- Links assets to the document library (Module 1/10).
-- doc_context describes why the document relates (manual, cert,
-- datasheet, warranty, etc.) — kept as a table so new contexts
-- can be added without migrations.
-- =============================================================

CREATE TABLE asset_document_types (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  requires_expiry boolean   NOT NULL DEFAULT false,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true
);

CREATE TABLE asset_documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         uuid        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  document_id      uuid        REFERENCES documents(id) ON DELETE SET NULL,
  asset_doc_type_id uuid       REFERENCES asset_document_types(id),
  -- For certificates / external docs not in the document library
  external_title   text,
  storage_path     text,
  file_name        text,
  expiry_date      date,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- ASSET INCIDENT LINKS
-- Bidirectional asset ↔ incident association.
-- =============================================================

CREATE TABLE asset_incident_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  incident_id     uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  link_type       text        NOT NULL DEFAULT 'involved'
                              CHECK (link_type IN ('involved','damaged','caused_by','nearby')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (asset_id, incident_id)
);

-- =============================================================
-- ALTER Module 6 tables to link inspections to specific assets
-- =============================================================

ALTER TABLE inspection_schedules
  ADD COLUMN asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;

ALTER TABLE inspections
  ADD COLUMN asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_assets_org_status    ON assets(organisation_id, status_id);
CREATE INDEX idx_assets_site_id       ON assets(site_id);
CREATE INDEX idx_assets_type_id       ON assets(asset_type_id);
CREATE INDEX idx_assets_number        ON assets(asset_number);
CREATE INDEX idx_assets_next_insp     ON assets(next_inspection_due) WHERE is_active = true;
CREATE INDEX idx_assets_next_maint    ON assets(next_maintenance_due) WHERE is_active = true;
CREATE INDEX idx_assets_operator      ON assets(assigned_operator_id);

CREATE INDEX idx_amr_asset_id         ON asset_maintenance_records(asset_id);
CREATE INDEX idx_amr_type_id          ON asset_maintenance_records(maintenance_type_id);
CREATE INDEX idx_amr_performed_at     ON asset_maintenance_records(asset_id, performed_at DESC);

CREATE INDEX idx_amp_record_id        ON asset_maintenance_parts(maintenance_record_id);

CREATE INDEX idx_aoos_asset_id        ON asset_out_of_service_events(asset_id);
CREATE INDEX idx_aoos_open            ON asset_out_of_service_events(asset_id)
                                      WHERE returned_to_service_at IS NULL;

CREATE INDEX idx_adoc_asset_id        ON asset_documents(asset_id);
CREATE INDEX idx_adoc_expiry          ON asset_documents(expiry_date)
                                      WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_ail_asset_id         ON asset_incident_links(asset_id);
CREATE INDEX idx_ail_incident_id      ON asset_incident_links(incident_id);
