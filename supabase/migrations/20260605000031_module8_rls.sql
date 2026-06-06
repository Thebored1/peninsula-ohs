-- =============================================================
-- MODULE 8: Row Level Security — Asset Management
-- =============================================================
-- Lookup tables (asset_types, asset_statuses, maintenance_types,
-- asset_document_types): all authenticated read; admin write.
--
-- assets: workers read own-site assets; supervisors manage at
--   their sites; HSE/admin full org.
-- Maintenance records: same scoping as parent asset.
-- OOS events: supervisor+ can flag; all can read at their site.

ALTER TABLE asset_types                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_statuses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_types            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_document_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_out_of_service_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance_parts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_incident_links         ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "at_select"   ON asset_types       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "at_write"    ON asset_types       FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "at_update"   ON asset_types       FOR UPDATE USING (is_system_admin());
CREATE POLICY "as2_select"  ON asset_statuses    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "as2_write"   ON asset_statuses    FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "mt_select"   ON maintenance_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mt_write"    ON maintenance_types FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "adt_select"  ON asset_document_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "adt_write"   ON asset_document_types FOR INSERT WITH CHECK (is_system_admin());

-- ASSETS
CREATE POLICY "asset_select_worker" ON assets FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND can_access_site(site_id));

CREATE POLICY "asset_insert" ON assets FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "asset_update" ON assets FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer()
         OR (is_supervisor() AND can_access_site(site_id)))
  );

CREATE POLICY "asset_delete" ON assets FOR DELETE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

-- OOS EVENTS
CREATE POLICY "aoos_select" ON asset_out_of_service_events FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_id AND can_access_site(a.site_id))
  );

CREATE POLICY "aoos_insert" ON asset_out_of_service_events FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "aoos_update" ON asset_out_of_service_events FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- MAINTENANCE RECORDS
CREATE POLICY "amr_select" ON asset_maintenance_records FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_id AND can_access_site(a.site_id))
  );

CREATE POLICY "amr_insert" ON asset_maintenance_records FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "amr_update" ON asset_maintenance_records FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer()
         OR (is_supervisor() AND EXISTS (
           SELECT 1 FROM assets a WHERE a.id = asset_id AND can_access_site(a.site_id)
         )))
  );

-- PARTS
CREATE POLICY "amp_select" ON asset_maintenance_parts FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_id AND can_access_site(a.site_id))
  );

CREATE POLICY "amp_insert" ON asset_maintenance_parts FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- ASSET DOCUMENTS
CREATE POLICY "adoc_select" ON asset_documents FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_id AND can_access_site(a.site_id))
  );

CREATE POLICY "adoc_write" ON asset_documents FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

-- INCIDENT LINKS
CREATE POLICY "ail_select" ON asset_incident_links FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_executive()
         OR EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_id AND can_access_site(a.site_id)))
  );

CREATE POLICY "ail_insert" ON asset_incident_links FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );
