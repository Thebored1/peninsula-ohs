ALTER TABLE toolbox_talk_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ttt" ON toolbox_talk_templates FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
ALTER TABLE toolbox_talk_template_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tttp" ON toolbox_talk_template_points FOR ALL USING (template_id IN (SELECT id FROM toolbox_talk_templates WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
ALTER TABLE toolbox_talk_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ttdel" ON toolbox_talk_deliveries FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));
ALTER TABLE toolbox_talk_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tta" ON toolbox_talk_attendees FOR ALL USING (delivery_id IN (SELECT id FROM toolbox_talk_deliveries WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));
ALTER TABLE toolbox_talk_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tts" ON toolbox_talk_schedules FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

INSERT INTO toolbox_talk_categories(id,name,colour_code,display_order) VALUES
(gen_random_uuid(),'Chemical & Hazardous Substances','#8a3ffc',1),
(gen_random_uuid(),'Manual Handling','#0f62fe',2),
(gen_random_uuid(),'Working at Heights','#da1e28',3),
(gen_random_uuid(),'Electrical Safety','#f1c21b',4),
(gen_random_uuid(),'Fire Safety & Emergency','#ff832b',5),
(gen_random_uuid(),'PPE Requirements','#007d79',6),
(gen_random_uuid(),'Environmental Awareness','#198038',7),
(gen_random_uuid(),'Mental Health & Wellbeing','#9ef0f0',8),
(gen_random_uuid(),'Equipment Pre-start','#6929c4',9),
(gen_random_uuid(),'Housekeeping','#525252',10),
(gen_random_uuid(),'Site-Specific Hazards','#005d5d',11),
(gen_random_uuid(),'Incident Learnings','#750e13',12)
ON CONFLICT(name) DO NOTHING;

-- Number generation
CREATE OR REPLACE FUNCTION generate_delivery_number() RETURNS TRIGGER AS $$
DECLARE v_counter INT;
BEGIN
  INSERT INTO reference_counters(organisation_id,sequence_key,last_value) VALUES(NEW.organisation_id,'TBX',1)
  ON CONFLICT(organisation_id,sequence_key) DO UPDATE SET last_value=reference_counters.last_value+1 RETURNING last_value INTO v_counter;
  NEW.delivery_number := 'TBX-'||to_char(CURRENT_DATE,'YYYY')||'-'||LPAD(v_counter::TEXT,5,'0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_delivery_number BEFORE INSERT ON toolbox_talk_deliveries FOR EACH ROW WHEN (NEW.delivery_number IS NULL) EXECUTE FUNCTION generate_delivery_number();
