-- Fatigue & Shift Monitoring Module — Row Level Security

-- fatigue_rule_sets
ALTER TABLE fatigue_rule_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatigue_rule_sets_org_select" ON fatigue_rule_sets
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fatigue_rule_sets_org_insert" ON fatigue_rule_sets
  FOR INSERT WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fatigue_rule_sets_org_update" ON fatigue_rule_sets
  FOR UPDATE USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fatigue_rule_sets_org_delete" ON fatigue_rule_sets
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- fatigue_rules (scoped via rule_set's organisation)
ALTER TABLE fatigue_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatigue_rules_org_select" ON fatigue_rules
  FOR SELECT USING (
    rule_set_id IN (
      SELECT id FROM fatigue_rule_sets
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "fatigue_rules_org_insert" ON fatigue_rules
  FOR INSERT WITH CHECK (
    rule_set_id IN (
      SELECT id FROM fatigue_rule_sets
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "fatigue_rules_org_update" ON fatigue_rules
  FOR UPDATE USING (
    rule_set_id IN (
      SELECT id FROM fatigue_rule_sets
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "fatigue_rules_org_delete" ON fatigue_rules
  FOR DELETE USING (
    rule_set_id IN (
      SELECT id FROM fatigue_rule_sets
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- shift_logs
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_logs_org_select" ON shift_logs
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "shift_logs_org_insert" ON shift_logs
  FOR INSERT WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "shift_logs_org_update" ON shift_logs
  FOR UPDATE USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "shift_logs_org_delete" ON shift_logs
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- fatigue_alerts
ALTER TABLE fatigue_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatigue_alerts_org_select" ON fatigue_alerts
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fatigue_alerts_org_insert" ON fatigue_alerts
  FOR INSERT WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fatigue_alerts_org_update" ON fatigue_alerts
  FOR UPDATE USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fatigue_alerts_org_delete" ON fatigue_alerts
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );
