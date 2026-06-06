ALTER TABLE emergency_response_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_erp" ON emergency_response_plans FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
ALTER TABLE erp_response_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ers" ON erp_response_steps FOR ALL USING (plan_id IN (SELECT id FROM emergency_response_plans WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
ALTER TABLE muster_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_mp" ON muster_points FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
ALTER TABLE emergency_wardens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ew" ON emergency_wardens FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
ALTER TABLE emergency_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ed" ON emergency_drills FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
ALTER TABLE emergency_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ea" ON emergency_activations FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

INSERT INTO emergency_types(id,name,colour_code,display_order) VALUES
(gen_random_uuid(),'Fire','#da1e28',1),
(gen_random_uuid(),'Medical Emergency','#ff832b',2),
(gen_random_uuid(),'Chemical Spill','#8a3ffc',3),
(gen_random_uuid(),'Natural Disaster','#0f62fe',4),
(gen_random_uuid(),'Bomb Threat','#393939',5),
(gen_random_uuid(),'Workplace Violence','#750e13',6),
(gen_random_uuid(),'Environmental Incident','#007d79',7)
ON CONFLICT(name) DO NOTHING;

-- Number generation
CREATE OR REPLACE FUNCTION generate_drill_number() RETURNS TRIGGER AS $$
DECLARE v_counter INT;
BEGIN
  INSERT INTO reference_counters(organisation_id,sequence_key,last_value) VALUES(NEW.organisation_id,'DRL',1)
  ON CONFLICT(organisation_id,sequence_key) DO UPDATE SET last_value=reference_counters.last_value+1 RETURNING last_value INTO v_counter;
  NEW.drill_number := 'DRL-'||to_char(CURRENT_DATE,'YYYY')||'-'||LPAD(v_counter::TEXT,5,'0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_drill_number BEFORE INSERT ON emergency_drills FOR EACH ROW WHEN (NEW.drill_number IS NULL) EXECUTE FUNCTION generate_drill_number();

CREATE OR REPLACE FUNCTION generate_plan_number() RETURNS TRIGGER AS $$
DECLARE v_counter INT;
BEGIN
  INSERT INTO reference_counters(organisation_id,sequence_key,last_value) VALUES(NEW.organisation_id,'ERP',1)
  ON CONFLICT(organisation_id,sequence_key) DO UPDATE SET last_value=reference_counters.last_value+1 RETURNING last_value INTO v_counter;
  NEW.plan_number := 'ERP-'||to_char(CURRENT_DATE,'YYYY')||'-'||LPAD(v_counter::TEXT,5,'0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_plan_number BEFORE INSERT ON emergency_response_plans FOR EACH ROW WHEN (NEW.plan_number IS NULL) EXECUTE FUNCTION generate_plan_number();
