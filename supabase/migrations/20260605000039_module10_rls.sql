-- =============================================================
-- MODULE 10: Row Level Security — Document Management
-- =============================================================

ALTER TABLE document_types                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_statuses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_review_workflows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_review_workflow_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_version_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgement_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links                      ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "dtp_select"  ON document_types   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dtp_write"   ON document_types   FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "dtp_update"  ON document_types   FOR UPDATE USING (is_system_admin());
CREATE POLICY "dst_select"  ON document_statuses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dst_write"   ON document_statuses FOR INSERT WITH CHECK (is_system_admin());

-- Review workflows: HSE/admin manage; all org members can read
CREATE POLICY "drwf_select" ON document_review_workflows FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "drwf_write" ON document_review_workflows FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "drwf_update" ON document_review_workflows FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "drwfs_select" ON document_review_workflow_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM document_review_workflows w WHERE w.id = workflow_id AND w.organisation_id = get_my_organisation_id()));
CREATE POLICY "drwfs_write"  ON document_review_workflow_steps FOR INSERT
  WITH CHECK ((is_hse_officer() OR is_system_admin()) AND EXISTS (SELECT 1 FROM document_review_workflows w WHERE w.id = workflow_id AND w.organisation_id = get_my_organisation_id()));

-- Version reviews: reviewer sees their own step; HSE/admin see all for the org
CREATE POLICY "dvr_select_reviewer" ON document_version_reviews FOR SELECT
  USING (reviewer_id = auth.uid());
CREATE POLICY "dvr_select_elevated" ON document_version_reviews FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
-- SECURITY DEFINER functions handle inserts
CREATE POLICY "dvr_update" ON document_version_reviews FOR UPDATE
  USING (reviewer_id = auth.uid() OR is_hse_officer() OR is_system_admin());

-- Acknowledgements: each user sees their own; HSE/admin see all
CREATE POLICY "dack_select_own"      ON document_acknowledgements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dack_select_elevated" ON document_acknowledgements FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor()));
CREATE POLICY "dack_insert" ON document_acknowledgements FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND user_id = auth.uid());

-- Ack requirements: HSE/admin manage; all can read (to know what they must acknowledge)
CREATE POLICY "dackreq_select" ON document_acknowledgement_requirements FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "dackreq_write" ON document_acknowledgement_requirements FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

-- Document links: all org members read; supervisors/HSE/admin write
CREATE POLICY "dlink_select" ON document_links FOR SELECT
  USING (organisation_id = get_my_organisation_id());
CREATE POLICY "dlink_insert" ON document_links FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer() OR is_supervisor()));
CREATE POLICY "dlink_delete" ON document_links FOR DELETE
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
