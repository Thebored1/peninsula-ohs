-- =============================================================
-- MODULE 18: JSA/JHA Builder — Row Level Security
-- =============================================================
-- All tables are scoped to organisation_id.
-- Child tables (jsa_steps, jsa_step_hazards, jsa_step_controls,
-- jsa_workers) are protected indirectly via their parent jsa_id —
-- policies join back to jsas to verify org membership.
-- =============================================================

ALTER TABLE jsas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_step_hazards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_step_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_workers       ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- JSAS — parent document
-- =============================================================

CREATE POLICY "jsas_select" ON jsas
  FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "jsas_insert" ON jsas
  FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "jsas_update" ON jsas
  FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "jsas_delete" ON jsas
  FOR DELETE
  USING (organisation_id IN (
    SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- =============================================================
-- JSA STEPS — child of jsas
-- =============================================================

CREATE POLICY "jsa_steps_select" ON jsa_steps
  FOR SELECT
  USING (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_steps_insert" ON jsa_steps
  FOR INSERT
  WITH CHECK (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_steps_update" ON jsa_steps
  FOR UPDATE
  USING (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_steps_delete" ON jsa_steps
  FOR DELETE
  USING (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- =============================================================
-- JSA STEP HAZARDS — child of jsa_steps
-- =============================================================

CREATE POLICY "jsa_hazards_select" ON jsa_step_hazards
  FOR SELECT
  USING (step_id IN (
    SELECT s.id FROM jsa_steps s
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_hazards_insert" ON jsa_step_hazards
  FOR INSERT
  WITH CHECK (step_id IN (
    SELECT s.id FROM jsa_steps s
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_hazards_update" ON jsa_step_hazards
  FOR UPDATE
  USING (step_id IN (
    SELECT s.id FROM jsa_steps s
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_hazards_delete" ON jsa_step_hazards
  FOR DELETE
  USING (step_id IN (
    SELECT s.id FROM jsa_steps s
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- =============================================================
-- JSA STEP CONTROLS — child of jsa_step_hazards
-- =============================================================

CREATE POLICY "jsa_controls_select" ON jsa_step_controls
  FOR SELECT
  USING (hazard_id IN (
    SELECT h.id FROM jsa_step_hazards h
    JOIN jsa_steps s ON s.id = h.step_id
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_controls_insert" ON jsa_step_controls
  FOR INSERT
  WITH CHECK (hazard_id IN (
    SELECT h.id FROM jsa_step_hazards h
    JOIN jsa_steps s ON s.id = h.step_id
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_controls_update" ON jsa_step_controls
  FOR UPDATE
  USING (hazard_id IN (
    SELECT h.id FROM jsa_step_hazards h
    JOIN jsa_steps s ON s.id = h.step_id
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_controls_delete" ON jsa_step_controls
  FOR DELETE
  USING (hazard_id IN (
    SELECT h.id FROM jsa_step_hazards h
    JOIN jsa_steps s ON s.id = h.step_id
    JOIN jsas j ON j.id = s.jsa_id
    WHERE j.organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- =============================================================
-- JSA WORKERS — child of jsas
-- =============================================================

CREATE POLICY "jsa_workers_select" ON jsa_workers
  FOR SELECT
  USING (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_workers_insert" ON jsa_workers
  FOR INSERT
  WITH CHECK (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_workers_update" ON jsa_workers
  FOR UPDATE
  USING (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "jsa_workers_delete" ON jsa_workers
  FOR DELETE
  USING (jsa_id IN (
    SELECT id FROM jsas
    WHERE organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));
