-- =============================================================
-- BACKGROUND CHECKS MODULE: Row Level Security
-- =============================================================

-- ─── HELPER FUNCTION ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_bgc_reviewer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT user_has_role('Background Check Reviewer');
$$;

-- ─── ENABLE RLS ───────────────────────────────────────────────────────────────

ALTER TABLE bgc_providers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_organisation_providers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_consent_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_role_requirements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_packages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_orders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_consent_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_consent_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_results                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_result_raw               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_adverse_action_notices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_disputes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_adjudications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_reference_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_reference_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_reference_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_reference_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_reverification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bgc_reverification_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_licences              ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_licence_alerts        ENABLE ROW LEVEL SECURITY;

-- ─── bgc_providers (read-only lookup, all authenticated users) ────────────────

CREATE POLICY "bgc_providers_select" ON bgc_providers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── bgc_organisation_providers ───────────────────────────────────────────────

CREATE POLICY "bgc_org_prov_select" ON bgc_organisation_providers FOR SELECT
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

CREATE POLICY "bgc_org_prov_insert" ON bgc_organisation_providers FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id() AND is_system_admin());

CREATE POLICY "bgc_org_prov_update" ON bgc_organisation_providers FOR UPDATE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

CREATE POLICY "bgc_org_prov_delete" ON bgc_organisation_providers FOR DELETE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

-- ─── bgc_consent_templates ────────────────────────────────────────────────────

CREATE POLICY "bgc_consent_tmpl_select" ON bgc_consent_templates FOR SELECT
  USING (
    organisation_id IS NULL
    OR organisation_id = get_my_organisation_id()
  );

CREATE POLICY "bgc_consent_tmpl_insert" ON bgc_consent_templates FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

CREATE POLICY "bgc_consent_tmpl_update" ON bgc_consent_templates FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
    AND is_locked = false
  );

-- ─── bgc_role_requirements ────────────────────────────────────────────────────

CREATE POLICY "bgc_role_req_select" ON bgc_role_requirements FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "bgc_role_req_insert" ON bgc_role_requirements FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "bgc_role_req_update" ON bgc_role_requirements FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "bgc_role_req_delete" ON bgc_role_requirements FOR DELETE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

-- ─── bgc_packages ─────────────────────────────────────────────────────────────

CREATE POLICY "bgc_pkg_select" ON bgc_packages FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_pkg_insert" ON bgc_packages FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "bgc_pkg_update" ON bgc_packages FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_pkg_delete" ON bgc_packages FOR DELETE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

-- ─── bgc_orders ───────────────────────────────────────────────────────────────

CREATE POLICY "bgc_order_select" ON bgc_orders FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_order_insert" ON bgc_orders FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "bgc_order_update" ON bgc_orders FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_bgc_reviewer())
  );

-- ─── bgc_consent_tokens (service role only — no user-facing SELECT) ───────────

-- No user-facing policies; accessed only via service role from server actions

-- ─── bgc_consent_records (permanent, admin read only) ─────────────────────────

CREATE POLICY "bgc_consent_rec_select" ON bgc_consent_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bgc_packages p
      WHERE p.id = package_id
        AND p.organisation_id = get_my_organisation_id()
    )
    AND (is_system_admin() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_consent_rec_insert" ON bgc_consent_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bgc_packages p
      WHERE p.id = package_id
        AND p.organisation_id = get_my_organisation_id()
    )
  );

-- ─── bgc_results (Reviewer and Admin only) ────────────────────────────────────

CREATE POLICY "bgc_results_select" ON bgc_results FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_results_insert" ON bgc_results FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());

CREATE POLICY "bgc_results_update" ON bgc_results FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer())
  );

-- ─── bgc_result_raw (System Admin only) ──────────────────────────────────────

CREATE POLICY "bgc_result_raw_select" ON bgc_result_raw FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bgc_orders o
      JOIN bgc_packages p ON p.id = o.package_id
      WHERE o.id = order_id AND p.organisation_id = get_my_organisation_id()
    )
    AND is_system_admin()
  );

CREATE POLICY "bgc_result_raw_insert" ON bgc_result_raw FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bgc_orders o
      JOIN bgc_packages p ON p.id = o.package_id
      WHERE o.id = order_id AND p.organisation_id = get_my_organisation_id()
    )
  );

-- ─── bgc_adverse_action_notices ───────────────────────────────────────────────

CREATE POLICY "bgc_adverse_select" ON bgc_adverse_action_notices FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer() OR is_hse_officer())
  );

CREATE POLICY "bgc_adverse_insert" ON bgc_adverse_action_notices FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_adverse_update" ON bgc_adverse_action_notices FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer())
  );

-- ─── bgc_disputes ─────────────────────────────────────────────────────────────

CREATE POLICY "bgc_dispute_select" ON bgc_disputes FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer() OR is_hse_officer())
  );

CREATE POLICY "bgc_dispute_insert" ON bgc_disputes FOR INSERT
  WITH CHECK (organisation_id = get_my_organisation_id());

CREATE POLICY "bgc_dispute_update" ON bgc_disputes FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer())
  );

-- ─── bgc_adjudications ────────────────────────────────────────────────────────

CREATE POLICY "bgc_adj_select" ON bgc_adjudications FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer() OR is_hse_officer())
  );

CREATE POLICY "bgc_adj_insert" ON bgc_adjudications FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_bgc_reviewer())
  );

-- ─── bgc_reference_templates ──────────────────────────────────────────────────

CREATE POLICY "bgc_ref_tmpl_select" ON bgc_reference_templates FOR SELECT
  USING (
    organisation_id IS NULL
    OR organisation_id = get_my_organisation_id()
  );

CREATE POLICY "bgc_ref_tmpl_insert" ON bgc_reference_templates FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "bgc_ref_tmpl_update" ON bgc_reference_templates FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- ─── bgc_reference_questions ──────────────────────────────────────────────────

CREATE POLICY "bgc_ref_q_select" ON bgc_reference_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bgc_reference_templates t
      WHERE t.id = template_id
        AND (t.organisation_id IS NULL OR t.organisation_id = get_my_organisation_id())
    )
  );

CREATE POLICY "bgc_ref_q_insert" ON bgc_reference_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bgc_reference_templates t
      WHERE t.id = template_id
        AND t.organisation_id = get_my_organisation_id()
        AND (is_system_admin() OR is_hse_officer())
    )
  );

CREATE POLICY "bgc_ref_q_update" ON bgc_reference_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bgc_reference_templates t
      WHERE t.id = template_id
        AND t.organisation_id = get_my_organisation_id()
        AND (is_system_admin() OR is_hse_officer())
    )
  );

-- ─── bgc_reference_requests ───────────────────────────────────────────────────

CREATE POLICY "bgc_ref_req_select" ON bgc_reference_requests FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_ref_req_insert" ON bgc_reference_requests FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "bgc_ref_req_update" ON bgc_reference_requests FOR UPDATE
  USING (organisation_id = get_my_organisation_id());

-- ─── bgc_reference_responses (service role on insert, reviewer on select) ─────

CREATE POLICY "bgc_ref_resp_select" ON bgc_reference_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bgc_reference_requests r
      JOIN bgc_packages p ON p.id = r.package_id
      WHERE r.id = request_id
        AND p.organisation_id = get_my_organisation_id()
        AND (is_system_admin() OR is_bgc_reviewer() OR is_hse_officer())
    )
  );

-- ─── bgc_reverification_schedules ─────────────────────────────────────────────

CREATE POLICY "bgc_rev_sched_select" ON bgc_reverification_schedules FOR SELECT
  USING (organisation_id = get_my_organisation_id());

CREATE POLICY "bgc_rev_sched_insert" ON bgc_reverification_schedules FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

CREATE POLICY "bgc_rev_sched_update" ON bgc_reverification_schedules FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- ─── bgc_reverification_events ────────────────────────────────────────────────

CREATE POLICY "bgc_rev_evt_select" ON bgc_reverification_events FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor() OR is_bgc_reviewer())
  );

CREATE POLICY "bgc_rev_evt_update" ON bgc_reverification_events FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_bgc_reviewer())
  );

-- ─── worker_licences ──────────────────────────────────────────────────────────

CREATE POLICY "wl_select" ON worker_licences FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (
      is_system_admin()
      OR is_hse_officer()
      OR is_supervisor()
      OR worker_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "wl_insert" ON worker_licences FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "wl_update" ON worker_licences FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_supervisor())
  );

CREATE POLICY "wl_delete" ON worker_licences FOR DELETE
  USING (organisation_id = get_my_organisation_id() AND is_system_admin());

-- ─── worker_licence_alerts ────────────────────────────────────────────────────

CREATE POLICY "wla_select" ON worker_licence_alerts FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );
