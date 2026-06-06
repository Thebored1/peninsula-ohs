-- Training & Competency Management — RLS & Triggers
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tc" ON training_courses FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE training_needs_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tnm" ON training_needs_matrix FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_tr" ON training_records FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE induction_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ip" ON induction_programs FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE induction_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_is" ON induction_steps FOR ALL USING (program_id IN (SELECT id FROM induction_programs WHERE organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid())));

ALTER TABLE induction_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ic" ON induction_completions FOR ALL USING (organisation_id IN (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()));

-- Trigger to auto-set status based on expiry
CREATE OR REPLACE FUNCTION update_training_record_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NULL THEN NEW.status := 'current';
  ELSIF NEW.expiry_date < CURRENT_DATE THEN NEW.status := 'expired';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN NEW.status := 'expiring_soon';
  ELSE NEW.status := 'current';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_training_record_status
  BEFORE INSERT OR UPDATE ON training_records
  FOR EACH ROW EXECUTE FUNCTION update_training_record_status();

-- Number generation
CREATE OR REPLACE FUNCTION generate_training_number() RETURNS TRIGGER AS $$
DECLARE v_counter INT;
BEGIN
  INSERT INTO reference_counters(organisation_id, sequence_key, last_value)
    VALUES(NEW.organisation_id, 'TRN', 1)
  ON CONFLICT(organisation_id, sequence_key)
    DO UPDATE SET last_value = reference_counters.last_value + 1
  RETURNING last_value INTO v_counter;
  NEW.record_number := 'TRN-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_counter::TEXT, 5, '0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_training_number
  BEFORE INSERT ON training_records
  FOR EACH ROW WHEN (NEW.record_number IS NULL)
  EXECUTE FUNCTION generate_training_number();
