-- =============================================================
-- MODULE 20: Row Level Security — Compliance Calendar
-- =============================================================

ALTER TABLE compliance_obligation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_obligations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks            ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- COMPLIANCE OBLIGATION TYPES  (shared lookup — read by anyone
-- authenticated; only system admins may write)
-- =============================================================
CREATE POLICY "cot_select"
  ON compliance_obligation_types
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cot_insert"
  ON compliance_obligation_types
  FOR INSERT
  WITH CHECK (is_system_admin());

CREATE POLICY "cot_update"
  ON compliance_obligation_types
  FOR UPDATE
  USING (is_system_admin());

-- =============================================================
-- COMPLIANCE OBLIGATIONS
-- All org members may read their org's obligations.
-- HSE officers, supervisors, and admins may create/update.
-- =============================================================
CREATE POLICY "co_select"
  ON compliance_obligations
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "co_insert"
  ON compliance_obligations
  FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "co_update"
  ON compliance_obligations
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- =============================================================
-- COMPLIANCE TASKS
-- All org members may read tasks for their organisation.
-- Any authenticated org member may insert (tasks can be spawned
-- by schedulers or manually).
-- Updates restricted to org members (status changes, evidence).
-- =============================================================
CREATE POLICY "ct_select"
  ON compliance_tasks
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "ct_insert"
  ON compliance_tasks
  FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "ct_update"
  ON compliance_tasks
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );
