-- =============================================================
-- MODULE 9: Row Level Security — Audit Management
-- =============================================================

ALTER TABLE audit_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_finding_outcomes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_template_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_template_criteria  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_criteria           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_finding_actions    ENABLE ROW LEVEL SECURITY;

-- Lookup tables
CREATE POLICY "aut_select"  ON audit_types           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "aut_write"   ON audit_types           FOR INSERT WITH CHECK (is_system_admin());
CREATE POLICY "afo_select"  ON audit_finding_outcomes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "afo_write"   ON audit_finding_outcomes FOR INSERT WITH CHECK (is_system_admin());

-- Templates: published templates readable by all org members; drafts by HSE/admin only
CREATE POLICY "atm_select"  ON audit_templates FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_published = true OR is_hse_officer() OR is_system_admin())
  );
CREATE POLICY "atm_write"   ON audit_templates FOR INSERT WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));
CREATE POLICY "atm_update"  ON audit_templates FOR UPDATE USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()));

CREATE POLICY "ats_select"  ON audit_template_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()));
CREATE POLICY "ats_write"   ON audit_template_sections FOR INSERT
  WITH CHECK ((is_hse_officer() OR is_system_admin()) AND EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()));
CREATE POLICY "atc_select"  ON audit_template_criteria FOR SELECT
  USING (EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()));
CREATE POLICY "atc_write"   ON audit_template_criteria FOR INSERT
  WITH CHECK ((is_hse_officer() OR is_system_admin()) AND EXISTS (SELECT 1 FROM audit_templates t WHERE t.id = template_id AND t.organisation_id = get_my_organisation_id()));

-- AUDITS: auditors see their own; supervisors read at their sites; HSE/exec/admin full org
CREATE POLICY "aud_select_auditor" ON audits FOR SELECT
  USING (lead_auditor_id = auth.uid() OR auth.uid() = ANY(auditor_ids) OR auth.uid() = ANY(auditee_ids));
CREATE POLICY "aud_select_elevated" ON audits FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer() OR is_executive() OR is_supervisor()));
CREATE POLICY "aud_insert" ON audits FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer()));
CREATE POLICY "aud_update" ON audits FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (is_system_admin() OR is_hse_officer() OR lead_auditor_id = auth.uid()));

-- AUDIT SECTIONS + CRITERIA: scoped by audit access
CREATE POLICY "asec_select" ON audit_sections FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM audits a WHERE a.id = audit_id
      AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids) OR is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor())
  ));
CREATE POLICY "asec_write" ON audit_sections FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()
    OR EXISTS (SELECT 1 FROM audits a WHERE a.id = audit_id AND a.lead_auditor_id = auth.uid())));
CREATE POLICY "acri_select" ON audit_criteria FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM audits a WHERE a.id = audit_id
      AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids) OR is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor())
  ));
CREATE POLICY "acri_write" ON audit_criteria FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()
    OR EXISTS (SELECT 1 FROM audits a WHERE a.id = audit_id AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids)))));

-- FINDINGS: auditors write; elevated roles read
CREATE POLICY "afnd_select" ON audit_findings FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM audits a WHERE a.id = audit_id
      AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids) OR is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor())
  ));
CREATE POLICY "afnd_write" ON audit_findings FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM audits a WHERE a.id = audit_id
      AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids) OR is_hse_officer() OR is_system_admin())
  ));
CREATE POLICY "afnd_update" ON audit_findings FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND (assessed_by = auth.uid() OR is_hse_officer() OR is_system_admin()
    OR EXISTS (SELECT 1 FROM audits a WHERE a.id = audit_id AND a.lead_auditor_id = auth.uid())));

-- EVIDENCE
CREATE POLICY "aev_select" ON audit_evidence FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND EXISTS (
    SELECT 1 FROM audits a WHERE a.id = audit_id
      AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids) OR is_hse_officer() OR is_system_admin() OR is_executive() OR is_supervisor())
  ));
CREATE POLICY "aev_insert" ON audit_evidence FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin()
    OR EXISTS (SELECT 1 FROM audits a WHERE a.id = audit_id AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids)))));

-- FINDING ACTIONS: SECURITY DEFINER RPC writes; elevated roles read
CREATE POLICY "afa_select" ON audit_finding_actions FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND (is_hse_officer() OR is_system_admin() OR is_supervisor() OR is_executive()
    OR EXISTS (SELECT 1 FROM audit_findings af JOIN audits a ON a.id = af.audit_id WHERE af.id = finding_id AND (a.lead_auditor_id = auth.uid() OR auth.uid() = ANY(a.auditor_ids)))));
