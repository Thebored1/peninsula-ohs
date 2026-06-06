-- Timestamp trigger for speak_up_reports
CREATE OR REPLACE FUNCTION update_speak_up_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_speak_up_reports_updated
  BEFORE UPDATE ON speak_up_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_speak_up_reports_timestamp();

-- Number generation trigger for speak_up_reports
CREATE OR REPLACE FUNCTION generate_speak_up_report_number()
RETURNS TRIGGER AS $$
DECLARE
  v_counter INT;
BEGIN
  INSERT INTO reference_counters (organisation_id, sequence_key, last_value)
  VALUES (NEW.organisation_id, 'SPK', 1)
  ON CONFLICT (organisation_id, sequence_key)
  DO UPDATE SET last_value = reference_counters.last_value + 1
  RETURNING last_value INTO v_counter;

  NEW.report_number := 'SPK-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_counter::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_speak_up_report_number
  BEFORE INSERT ON speak_up_reports
  FOR EACH ROW
  WHEN (NEW.report_number IS NULL)
  EXECUTE FUNCTION generate_speak_up_report_number();
