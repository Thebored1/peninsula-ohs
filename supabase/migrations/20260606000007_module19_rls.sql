-- =============================================================
-- MODULE 19: Row Level Security — LOTO Procedures
-- =============================================================

ALTER TABLE loto_energy_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loto_procedures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loto_isolation_points  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loto_authorizations    ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- LOTO ENERGY TYPES
-- Global reference data — any authenticated user can read.
-- Write access reserved for system admins.
-- =============================================================
CREATE POLICY "loto_et_select" ON loto_energy_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "loto_et_insert" ON loto_energy_types
  FOR INSERT WITH CHECK (is_system_admin());

CREATE POLICY "loto_et_update" ON loto_energy_types
  FOR UPDATE USING (is_system_admin());

-- =============================================================
-- LOTO PROCEDURES
-- Scoped to the user's organisation.
-- =============================================================
CREATE POLICY "loto_proc_select" ON loto_procedures
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "loto_proc_insert" ON loto_procedures
  FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "loto_proc_update" ON loto_procedures
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- =============================================================
-- LOTO ISOLATION POINTS
-- Access via the parent procedure's organisation membership.
-- =============================================================
CREATE POLICY "loto_iso_select" ON loto_isolation_points
  FOR SELECT
  USING (
    procedure_id IN (
      SELECT id FROM loto_procedures
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "loto_iso_insert" ON loto_isolation_points
  FOR INSERT
  WITH CHECK (
    procedure_id IN (
      SELECT id FROM loto_procedures
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "loto_iso_update" ON loto_isolation_points
  FOR UPDATE
  USING (
    procedure_id IN (
      SELECT id FROM loto_procedures
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "loto_iso_delete" ON loto_isolation_points
  FOR DELETE
  USING (
    procedure_id IN (
      SELECT id FROM loto_procedures
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- =============================================================
-- LOTO AUTHORIZATIONS
-- Scoped directly to the user's organisation.
-- =============================================================
CREATE POLICY "loto_auth_select" ON loto_authorizations
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "loto_auth_insert" ON loto_authorizations
  FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "loto_auth_update" ON loto_authorizations
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );
