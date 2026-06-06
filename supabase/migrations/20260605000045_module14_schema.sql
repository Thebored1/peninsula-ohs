-- =============================================================
-- MODULE 14: Chemical & Hazardous Materials Management — Schema
-- =============================================================
-- Design principles:
--   • All classification systems (GHS hazard classes, physical
--     states, categories) are lookup tables — chemical hazard
--     taxonomy evolves with regulation.
--   • SDS key fields (first aid, spill response, PPE, limits)
--     are stored as structured columns for instant in-app
--     display without PDF parsing.
--   • Inventory is event-sourced: chemical_inventory_transactions
--     drives the balance in chemical_inventory.
--   • Compatibility rules are symmetrical (A,B == B,A).
--
-- Tables (14):
--   chemical_categories          — lookup: broad hazard class
--   chemical_hazard_classes      — GHS hazard class lookup
--   chemical_physical_states     — lookup: liquid, gas, solid, etc.
--   chemicals                    — the chemical register entry
--   chemical_hazard_classifications — junction: chemical ↔ GHS classes
--   chemical_sds                 — SDS version records + key extracted fields
--   chemical_exposure_standards  — OEL/TWA/STEL limits per chemical
--   chemical_storage_locations   — specific storage cabinets/areas
--   chemical_inventory           — current stock at each location
--   chemical_inventory_transactions — all stock movements
--   chemical_usage_logs          — who used what, when, how much
--   chemical_compatibility_rules — pairs that must not be co-stored
--   chemical_waste_disposals     — waste/disposal records
--   chemical_incident_links      — links to Module 4 incidents
-- =============================================================

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

CREATE TABLE chemical_categories (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- GHS / UN hazard class codes (H-statements, pictograms)
CREATE TABLE chemical_hazard_classes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,  -- e.g. 'H225', 'H301'
  ghs_pictogram   text,                         -- 'flame', 'skull', 'exclamation', etc.
  hazard_class    text        NOT NULL,          -- e.g. 'Flammable Liquid Category 2'
  description     text,
  display_order   integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chemical_physical_states (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  display_order integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true
);

-- =============================================================
-- CHEMICALS
-- chemical_number: CHEM-YYYY-NNNNN
-- qr_code_data: used for SDS quick-access scanning.
-- current_sds_id: set by trigger when an SDS is published.
-- =============================================================

CREATE TABLE chemicals (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  site_id               uuid        REFERENCES sites(id),
  category_id           uuid        REFERENCES chemical_categories(id),
  physical_state_id     uuid        REFERENCES chemical_physical_states(id),

  chemical_number       text        UNIQUE,        -- CHEM-2026-00001
  name                  text        NOT NULL,
  common_names          text[]      NOT NULL DEFAULT '{}',  -- synonyms, trade names
  cas_number            text,                               -- CAS registry number
  un_number             text,                               -- UN transport class
  chemical_formula      text,

  is_hazardous          boolean     NOT NULL DEFAULT true,

  -- Current SDS (updated by trigger)
  current_sds_id        uuid,       -- deferred FK — added via ALTER below

  -- Storage
  storage_class         text,       -- AS 1940 / ADG Code storage class
  segregation_group     text,       -- incompatibility group for warehouse
  max_site_quantity     decimal(12,4),
  quantity_unit         text        NOT NULL DEFAULT 'L'
                                    CHECK (quantity_unit IN ('L','mL','kg','g','m3','units')),

  -- QR / quick access
  qr_code_data          text,       -- typically the chemical UUID or URL

  -- Review
  review_frequency_days integer     NOT NULL DEFAULT 730,  -- SDS review cycle (2 years typical)
  next_review_date      date,

  is_active             boolean     NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- CHEMICAL HAZARD CLASSIFICATIONS
-- A chemical can have multiple GHS hazard classes.
-- =============================================================

CREATE TABLE chemical_hazard_classifications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id      uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  hazard_class_id  uuid        NOT NULL REFERENCES chemical_hazard_classes(id),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id),
  category_detail  text,       -- e.g. 'Category 1A' within the hazard class
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chemical_id, hazard_class_id)
);

-- =============================================================
-- CHEMICAL SDS
-- Each SDS has a status: current | superseded | expired.
-- Key GHS sections are extracted for instant in-app display.
-- The PDF is stored in Supabase Storage (storage_path).
-- Can optionally be linked to the document library (document_id).
-- =============================================================

CREATE TABLE chemical_sds (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id           uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),

  -- Provenance
  supplier_name         text,
  manufacturer_name     text,
  issue_date            date,
  revision_date         date,
  next_review_date      date,
  version               text,

  status                text        NOT NULL DEFAULT 'current'
                                    CHECK (status IN ('current','superseded','expired','draft')),

  -- File
  storage_path          text,       -- Supabase Storage path to the PDF
  file_name             text,
  file_size             bigint,
  document_id           uuid        REFERENCES documents(id) ON DELETE SET NULL, -- Module 10 link

  -- === KEY EXTRACTED GHS SECTIONS ===
  -- Section 2 — Hazard identification
  signal_word           text        CHECK (signal_word IN ('Danger','Warning',NULL)),
  h_statements          text[],     -- e.g. ['H225','H301']
  p_statements          text[],     -- e.g. ['P210','P301+P310']
  ghs_pictograms        text[],     -- ['flame','skull','corrosion']

  -- Section 4 — First aid measures
  first_aid_inhalation  text,
  first_aid_skin        text,
  first_aid_eyes        text,
  first_aid_ingestion   text,

  -- Section 5 — Firefighting
  fire_extinguishing_media  text,
  fire_hazards          text,

  -- Section 6 — Accidental release / spill response
  spill_response        text,
  spill_ppe             text,

  -- Section 7 — Handling and storage
  handling_precautions  text,
  storage_requirements  text,
  incompatible_materials text,

  -- Section 8 — Exposure controls / PPE
  exposure_controls     text,
  ppe_required          text[],     -- ['safety_glasses','nitrile_gloves','respirator']
  respiratory_protection text,
  ventilation_required  boolean     NOT NULL DEFAULT false,

  -- Section 9 — Physical and chemical properties
  flash_point_celsius   decimal(7,2),
  boiling_point_celsius decimal(7,2),
  auto_ignition_celsius decimal(7,2),
  vapour_pressure_kpa   decimal(10,4),
  specific_gravity      decimal(6,3),
  solubility_water      text,

  -- Section 13 — Disposal
  disposal_requirements text,

  -- Section 14 — Transport
  transport_un_number   text,
  transport_class       text,
  transport_packing_group text,

  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

-- Add FK now that chemical_sds exists
ALTER TABLE chemicals ADD CONSTRAINT fk_chemicals_current_sds
  FOREIGN KEY (current_sds_id) REFERENCES chemical_sds(id) ON DELETE SET NULL;

-- =============================================================
-- CHEMICAL EXPOSURE STANDARDS
-- Legal workplace exposure limits. Multiple per chemical
-- (different jurisdictions, different measurement types).
-- =============================================================

CREATE TABLE chemical_exposure_standards (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id     uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  standard_type   text        NOT NULL
                              CHECK (standard_type IN ('TWA','STEL','IDLH','ceiling','peak')),
  value           decimal(12,4) NOT NULL,
  unit            text        NOT NULL,   -- 'ppm', 'mg/m3', 'fibres/mL'
  jurisdiction    text,                   -- 'AU-WHS','AU-WA','NZ','US-OSHA', etc.
  reference       text,                   -- document/standard reference
  effective_date  date,
  is_current      boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- CHEMICAL STORAGE LOCATIONS
-- Specific cabinets, rooms, or areas where chemicals are stored.
-- More granular than work_areas.
-- =============================================================

CREATE TABLE chemical_storage_locations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  site_id         uuid        NOT NULL REFERENCES sites(id),
  work_area_id    uuid        REFERENCES work_areas(id),
  name            text        NOT NULL,
  location_code   text,       -- e.g. 'CAB-01', 'STORE-A'
  description     text,
  storage_class   text,       -- what classes can be stored here
  max_quantity    decimal(12,4),
  quantity_unit   text,
  is_flammable_cabinet boolean NOT NULL DEFAULT false,
  is_locked       boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- CHEMICAL INVENTORY
-- Current balance at each storage location.
-- Updated by trigger when a transaction is recorded.
-- =============================================================

CREATE TABLE chemical_inventory (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id           uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  storage_location_id   uuid        NOT NULL REFERENCES chemical_storage_locations(id),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  quantity_on_hand      decimal(12,4) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  unit                  text        NOT NULL,
  max_quantity          decimal(12,4),   -- site-specific max (may differ from chemical default)
  last_stocktake_date   date,
  last_stocktake_by     uuid        REFERENCES auth.users(id),
  notes                 text,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chemical_id, storage_location_id)
);

-- =============================================================
-- CHEMICAL INVENTORY TRANSACTIONS
-- Append-only ledger of all stock movements.
-- transaction_type drives the sign: +ve = in, -ve = out.
-- =============================================================

CREATE TABLE chemical_inventory_transactions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id           uuid        NOT NULL REFERENCES chemicals(id),
  storage_location_id   uuid        NOT NULL REFERENCES chemical_storage_locations(id),
  inventory_id          uuid        REFERENCES chemical_inventory(id),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  transaction_type      text        NOT NULL
                                    CHECK (transaction_type IN (
                                      'received','used','disposed','transferred_in',
                                      'transferred_out','stocktake_adjustment','expired_disposal'
                                    )),
  quantity              decimal(12,4) NOT NULL,  -- always positive; type implies direction
  unit                  text        NOT NULL,
  reference             text,   -- PO number, batch number, manifest number
  transacted_by         uuid    REFERENCES auth.users(id),
  transacted_at         timestamptz NOT NULL DEFAULT now(),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE RULE no_update_chem_transactions
  AS ON UPDATE TO chemical_inventory_transactions DO INSTEAD NOTHING;
CREATE RULE no_delete_chem_transactions
  AS ON DELETE TO chemical_inventory_transactions DO INSTEAD NOTHING;

-- =============================================================
-- CHEMICAL USAGE LOGS
-- Records individual use events — who used it, where, how much.
-- Links to work orders or tasks if available.
-- =============================================================

CREATE TABLE chemical_usage_logs (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id           uuid        NOT NULL REFERENCES chemicals(id),
  storage_location_id   uuid        REFERENCES chemical_storage_locations(id),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id),
  site_id               uuid        REFERENCES sites(id),
  used_by               uuid        REFERENCES auth.users(id),
  used_at               timestamptz NOT NULL DEFAULT now(),
  quantity_used         decimal(12,4),
  unit                  text,
  task_description      text,
  ppe_worn              text[],    -- what PPE the user recorded wearing
  exposure_occurred     boolean    NOT NULL DEFAULT false,
  exposure_notes        text,
  -- Links to other records
  action_id             uuid       REFERENCES actions(id) ON DELETE SET NULL,
  permit_id             uuid       REFERENCES permits(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- CHEMICAL COMPATIBILITY RULES
-- Pairs of chemicals that must not be co-stored or mixed.
-- Symmetrical: enforced by CHECK (chemical_a_id < chemical_b_id).
-- =============================================================

CREATE TABLE chemical_compatibility_rules (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  chemical_a_id       uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  chemical_b_id       uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  incompatibility_type text       NOT NULL DEFAULT 'incompatible'
                                  CHECK (incompatibility_type IN ('incompatible','reactive','toxic_reaction','fire_risk')),
  description         text        NOT NULL,
  source              text,       -- which SDS section or standard this comes from
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (chemical_a_id < chemical_b_id),   -- enforces symmetry
  UNIQUE (chemical_a_id, chemical_b_id)
);

-- =============================================================
-- CHEMICAL WASTE DISPOSALS
-- Records of chemical waste disposal with chain-of-custody.
-- =============================================================

CREATE TABLE chemical_waste_disposals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id         uuid        NOT NULL REFERENCES chemicals(id),
  organisation_id     uuid        NOT NULL REFERENCES organisations(id),
  site_id             uuid        REFERENCES sites(id),
  waste_type          text        NOT NULL
                                  CHECK (waste_type IN ('expired','contaminated','excess','spill_cleanup','other')),
  quantity            decimal(12,4) NOT NULL,
  unit                text        NOT NULL,
  waste_contractor    text,
  manifest_number     text,       -- EPA/regulatory waste manifest
  disposal_method     text,
  disposal_date       date        NOT NULL,
  disposed_by         uuid        REFERENCES auth.users(id),
  cost                decimal(10,2),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

-- =============================================================
-- CHEMICAL INCIDENT LINKS
-- =============================================================

CREATE TABLE chemical_incident_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id     uuid        NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
  incident_id     uuid        NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES organisations(id),
  role            text        NOT NULL DEFAULT 'involved'
                              CHECK (role IN ('involved','spilled','released','ignited','contaminated','other')),
  quantity_involved decimal(12,4),
  unit            text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id),
  UNIQUE (chemical_id, incident_id)
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_chem_org_active      ON chemicals(organisation_id, is_active);
CREATE INDEX idx_chem_site_id         ON chemicals(site_id);
CREATE INDEX idx_chem_category        ON chemicals(category_id);
CREATE INDEX idx_chem_number          ON chemicals(chemical_number);
CREATE INDEX idx_chem_cas             ON chemicals(cas_number);
CREATE INDEX idx_chem_review          ON chemicals(next_review_date) WHERE is_active = true;

CREATE INDEX idx_chc_chemical_id      ON chemical_hazard_classifications(chemical_id);
CREATE INDEX idx_csds_chemical_id     ON chemical_sds(chemical_id);
CREATE INDEX idx_csds_status          ON chemical_sds(chemical_id, status);
CREATE INDEX idx_csds_review          ON chemical_sds(next_review_date) WHERE status = 'current';

CREATE INDEX idx_ces_chemical_id      ON chemical_exposure_standards(chemical_id);
CREATE INDEX idx_csl_site_id          ON chemical_storage_locations(site_id);

CREATE INDEX idx_ci_chemical_id       ON chemical_inventory(chemical_id);
CREATE INDEX idx_ci_location_id       ON chemical_inventory(storage_location_id);
CREATE INDEX idx_cit_chemical_id      ON chemical_inventory_transactions(chemical_id, transacted_at DESC);
CREATE INDEX idx_cit_location_id      ON chemical_inventory_transactions(storage_location_id);

CREATE INDEX idx_cul_chemical_id      ON chemical_usage_logs(chemical_id);
CREATE INDEX idx_cul_used_by          ON chemical_usage_logs(used_by);
CREATE INDEX idx_cul_site_id          ON chemical_usage_logs(site_id);

CREATE INDEX idx_ccr_a                ON chemical_compatibility_rules(chemical_a_id);
CREATE INDEX idx_ccr_b                ON chemical_compatibility_rules(chemical_b_id);
CREATE INDEX idx_cwd_chemical_id      ON chemical_waste_disposals(chemical_id);
CREATE INDEX idx_cil_chemical_id      ON chemical_incident_links(chemical_id);
CREATE INDEX idx_cil_incident_id      ON chemical_incident_links(incident_id);
