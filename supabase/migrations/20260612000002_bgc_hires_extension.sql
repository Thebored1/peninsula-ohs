-- =============================================================
-- BACKGROUND CHECKS MODULE: Hires Table Extension
-- =============================================================
-- Adds BGC linkage columns to the existing hires table.
-- =============================================================

ALTER TABLE hires
  ADD COLUMN bgc_package_id  uuid    REFERENCES bgc_packages(id) ON DELETE SET NULL,
  ADD COLUMN bgc_required     boolean NOT NULL DEFAULT false,
  ADD COLUMN bgc_status       text;   -- mirrors bgc_packages.status for JOIN-free queries

CREATE INDEX idx_hires_bgc_pkg ON hires(bgc_package_id) WHERE bgc_package_id IS NOT NULL;
