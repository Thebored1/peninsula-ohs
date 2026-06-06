-- =============================================================
-- MODULE 4: Triggers & Functions — Incident Management
-- =============================================================

-- =============================================================
-- UPDATED_AT HOUSEKEEPING
-- =============================================================

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_incident_witnesses_updated_at
  BEFORE UPDATE ON incident_witnesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_incident_medical_updated_at
  BEFORE UPDATE ON incident_medical
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_investigations_updated_at
  BEFORE UPDATE ON investigations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rca_five_whys_updated_at
  BEFORE UPDATE ON rca_five_whys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rca_fishbone_updated_at
  BEFORE UPDATE ON rca_fishbone
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_incident_capa_updated_at
  BEFORE UPDATE ON incident_capa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_regulatory_submissions_updated_at
  BEFORE UPDATE ON regulatory_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- REFERENCE NUMBER GENERATION
-- next_reference_number() atomically increments the counter for
-- (entity_type, organisation_id, current_year) and returns a
-- formatted reference string: PREFIX-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION next_reference_number(
  p_entity_type     text,
  p_organisation_id uuid,
  p_prefix          text
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_year   integer := EXTRACT(YEAR FROM now())::integer;
  v_num    integer;
BEGIN
  INSERT INTO reference_counters (entity_type, organisation_id, year, last_number)
  VALUES (p_entity_type, p_organisation_id, v_year, 1)
  ON CONFLICT (entity_type, organisation_id, year)
  DO UPDATE SET last_number = reference_counters.last_number + 1
  RETURNING last_number INTO v_num;

  RETURN p_prefix || '-' || v_year || '-' || LPAD(v_num::text, 5, '0');
END;
$$;

-- =============================================================
-- INCIDENT NUMBER — BEFORE INSERT
-- =============================================================

CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number := next_reference_number('incident', NEW.organisation_id, 'INC');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_incident_number
  BEFORE INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

-- =============================================================
-- INVESTIGATION NUMBER — BEFORE INSERT
-- =============================================================

CREATE OR REPLACE FUNCTION generate_investigation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.investigation_number IS NULL THEN
    NEW.investigation_number := next_reference_number('investigation', NEW.organisation_id, 'INV');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_investigation_number
  BEFORE INSERT ON investigations
  FOR EACH ROW EXECUTE FUNCTION generate_investigation_number();

-- =============================================================
-- CAPA NUMBER — BEFORE INSERT
-- =============================================================

CREATE OR REPLACE FUNCTION generate_capa_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.capa_number IS NULL THEN
    NEW.capa_number := next_reference_number('capa', NEW.organisation_id, 'CAPA');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_capa_number
  BEFORE INSERT ON incident_capa
  FOR EACH ROW EXECUTE FUNCTION generate_capa_number();

-- =============================================================
-- STATUS HISTORY TRACKING
-- Fires AFTER UPDATE OF status on incidents.
-- Logs every transition and fires the corresponding
-- create_notification() event from Module 3.
-- =============================================================

CREATE OR REPLACE FUNCTION track_incident_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_data      jsonb;
  v_site_name text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Log the transition
  INSERT INTO incident_status_history (
    incident_id, organisation_id,
    from_status, to_status,
    changed_by, notes
  ) VALUES (
    NEW.id, NEW.organisation_id,
    OLD.status, NEW.status,
    auth.uid(), NULL
  );

  -- Build notification data payload
  SELECT name INTO v_site_name FROM sites WHERE id = NEW.site_id;

  v_data := jsonb_build_object(
    'incident_number',  NEW.incident_number,
    'incident_title',   NEW.title,
    'site_name',        COALESCE(v_site_name, ''),
    'severity_level',   NEW.severity_level_id,
    'status',           NEW.status,
    'reporter_id',      NEW.submitted_by
  );

  -- Fire the relevant notification event
  CASE NEW.status
    WHEN 'submitted' THEN
      PERFORM create_notification(
        'incidents.submitted',
        NEW.organisation_id,
        NEW.site_id,
        'incident',
        NEW.id,
        v_data
      );

    WHEN 'triaged' THEN
      PERFORM create_notification(
        'incidents.triaged',
        NEW.organisation_id,
        NEW.site_id,
        'incident',
        NEW.id,
        v_data
      );

    WHEN 'closed' THEN
      PERFORM create_notification(
        'incidents.closed',
        NEW.organisation_id,
        NEW.site_id,
        'incident',
        NEW.id,
        v_data
      );

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_incident_status
  AFTER UPDATE OF status ON incidents
  FOR EACH ROW EXECUTE FUNCTION track_incident_status_change();

-- =============================================================
-- AUTO-SET submitted_at / triaged_at / closed_at
-- Timestamps the workflow milestones automatically.
-- =============================================================

CREATE OR REPLACE FUNCTION stamp_incident_workflow_times()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.submitted_by  := COALESCE(NEW.submitted_by, auth.uid());
    NEW.submitted_at  := COALESCE(NEW.submitted_at, now());
  END IF;

  IF NEW.status = 'triaged' AND OLD.status IN ('submitted') THEN
    NEW.triaged_by  := COALESCE(NEW.triaged_by, auth.uid());
    NEW.triaged_at  := COALESCE(NEW.triaged_at, now());
  END IF;

  IF NEW.status = 'closed' THEN
    NEW.closed_by := COALESCE(NEW.closed_by, auth.uid());
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;

  -- Auto-flag regulatory reporting based on severity level
  IF NEW.severity_level_id IS NOT NULL AND OLD.severity_level_id IS DISTINCT FROM NEW.severity_level_id THEN
    SELECT regulatory_reporting_required
    INTO NEW.regulatory_reportable
    FROM severity_levels
    WHERE id = NEW.severity_level_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_incident_workflow
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION stamp_incident_workflow_times();

-- =============================================================
-- AUTO-ASSIGN INCIDENT ON SUBMISSION
-- When an incident is submitted, auto-assign to the manager of
-- the department/site if not already assigned.
-- =============================================================

CREATE OR REPLACE FUNCTION auto_assign_incident()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_manager_id uuid;
BEGIN
  IF NEW.status <> 'submitted' OR NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try department manager first, then site-level user role fallback
  IF NEW.department_id IS NOT NULL THEN
    SELECT manager_id INTO v_manager_id
    FROM departments WHERE id = NEW.department_id;
  END IF;

  -- Fall back to any active Supervisor at the site
  IF v_manager_id IS NULL AND NEW.site_id IS NOT NULL THEN
    SELECT ur.user_id INTO v_manager_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.site_id    = NEW.site_id
      AND r.name        = 'Supervisor'
      AND ur.is_active  = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
    LIMIT 1;
  END IF;

  IF v_manager_id IS NOT NULL THEN
    NEW.assigned_to  := v_manager_id;
    NEW.assigned_at  := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_incident
  BEFORE UPDATE OF status ON incidents
  FOR EACH ROW
  WHEN (NEW.status = 'submitted')
  EXECUTE FUNCTION auto_assign_incident();

-- =============================================================
-- CAPA OVERDUE DETECTION
-- When due_date is in the past and status is still open/in_progress,
-- mark as overdue. Called as a BEFORE UPDATE guard and also
-- available as a standalone function for the scheduler.
-- =============================================================

CREATE OR REPLACE FUNCTION check_capa_overdue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.due_date IS NOT NULL
     AND NEW.due_date < CURRENT_DATE
     AND NEW.status IN ('open', 'in_progress')
  THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_capa_overdue
  BEFORE INSERT OR UPDATE ON incident_capa
  FOR EACH ROW EXECUTE FUNCTION check_capa_overdue();

-- mark_overdue_capas() — called by pg_cron daily to bulk-update
CREATE OR REPLACE FUNCTION mark_overdue_capas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  WITH overdue AS (
    UPDATE incident_capa
    SET status     = 'overdue',
        updated_at = now()
    WHERE due_date < CURRENT_DATE
      AND status   IN ('open', 'in_progress')
    RETURNING id, incident_id, organisation_id, assigned_to
  )
  -- Fire notification for each newly overdue CAPA
  SELECT COUNT(*) INTO v_count FROM overdue;

  -- Batch notifications handled by separate Edge Function sweep
  RETURN v_count;
END;
$$;

-- =============================================================
-- NOTIFY ON CAPA ASSIGNED
-- Fires a notification to the assignee when a CAPA is created
-- or when assigned_to changes.
-- =============================================================

CREATE OR REPLACE FUNCTION notify_capa_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_data       jsonb;
  v_site_name  text;
  v_inc_number text;
BEGIN
  -- Only fire when there is an assignee and it has just been set/changed
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_to = NEW.assigned_to THEN RETURN NEW; END IF;

  SELECT i.incident_number, s.name
  INTO v_inc_number, v_site_name
  FROM incidents i
  LEFT JOIN sites s ON s.id = i.site_id
  WHERE i.id = NEW.incident_id;

  v_data := jsonb_build_object(
    'capa_number',       NEW.capa_number,
    'action_title',      NEW.title,
    'due_date',          COALESCE(NEW.due_date::text, 'not set'),
    'incident_reference', COALESCE(v_inc_number, ''),
    'site_name',         COALESCE(v_site_name, ''),
    'reporter_id',       NEW.assigned_to
  );

  -- Use Module 3 notification engine
  PERFORM create_notification(
    'incidents.capa_assigned',
    NEW.organisation_id,
    (SELECT site_id FROM incidents WHERE id = NEW.incident_id),
    'incident_capa',
    NEW.id,
    v_data
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_capa_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON incident_capa
  FOR EACH ROW EXECUTE FUNCTION notify_capa_assigned();

-- =============================================================
-- INVESTIGATION CREATED → NOTIFY INVESTIGATOR
-- =============================================================

CREATE OR REPLACE FUNCTION notify_investigator_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_data       jsonb;
  v_inc        record;
BEGIN
  IF NEW.investigator_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.investigator_id IS NOT DISTINCT FROM NEW.investigator_id THEN
    RETURN NEW;
  END IF;

  SELECT i.incident_number, i.title, s.name AS site_name
  INTO v_inc
  FROM incidents i
  LEFT JOIN sites s ON s.id = i.site_id
  WHERE i.id = NEW.incident_id;

  v_data := jsonb_build_object(
    'investigation_number', NEW.investigation_number,
    'incident_reference',   COALESCE(v_inc.incident_number, ''),
    'incident_title',       COALESCE(v_inc.title, ''),
    'site_name',            COALESCE(v_inc.site_name, ''),
    'reporter_id',          NEW.investigator_id,
    'target_date',          COALESCE(NEW.target_completion_date::text, 'not set')
  );

  PERFORM create_notification(
    'incidents.investigation_assigned',
    NEW.organisation_id,
    (SELECT site_id FROM incidents WHERE id = NEW.incident_id),
    'investigation',
    NEW.id,
    v_data
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_investigator_assigned
  AFTER INSERT OR UPDATE OF investigator_id ON investigations
  FOR EACH ROW EXECUTE FUNCTION notify_investigator_assigned();

-- =============================================================
-- SYNC INCIDENT STATUS FROM INVESTIGATION / CAPA
-- When an investigation status changes, reflect it back on
-- the parent incident so the incident list always shows
-- the most meaningful current state.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_incident_status_from_investigation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'in_progress', 'rca_complete' THEN
      UPDATE incidents SET status = 'under_investigation', updated_at = now()
      WHERE id = NEW.incident_id AND status NOT IN ('closed','cancelled');

    WHEN 'capa_in_progress' THEN
      UPDATE incidents SET status = 'capa_in_progress', updated_at = now()
      WHERE id = NEW.incident_id AND status NOT IN ('closed','cancelled');

    WHEN 'pending_review' THEN
      UPDATE incidents SET status = 'pending_approval', updated_at = now()
      WHERE id = NEW.incident_id AND status NOT IN ('closed','cancelled');

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_incident_from_investigation
  AFTER UPDATE OF status ON investigations
  FOR EACH ROW EXECUTE FUNCTION sync_incident_status_from_investigation();

-- =============================================================
-- ROW VERSIONING — apply to all core incident tables
-- Reuses row_version_trigger_function from Module 2.
-- =============================================================

CREATE TRIGGER version_incidents
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_investigations
  AFTER INSERT OR UPDATE OR DELETE ON investigations
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_incident_capa
  AFTER INSERT OR UPDATE OR DELETE ON incident_capa
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_regulatory_submissions
  AFTER INSERT OR UPDATE OR DELETE ON regulatory_submissions
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

-- =============================================================
-- UTILITY: get_incident_summary()
-- Returns a structured summary of an incident for dashboards
-- and notification data payloads.
-- =============================================================

CREATE OR REPLACE FUNCTION get_incident_summary(p_incident_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'incident_number',    i.incident_number,
    'title',              i.title,
    'status',             i.status,
    'incident_type',      it.name,
    'severity_level',     sl.name,
    'severity_number',    sl.level_number,
    'site_name',          s.name,
    'department_name',    d.name,
    'submitted_by',       up.display_name,
    'incident_date',      i.incident_date,
    'was_injury',         i.was_injury_involved,
    'regulatory_required',i.regulatory_reportable,
    'open_capa_count',    (
      SELECT COUNT(*) FROM incident_capa c
      WHERE c.incident_id = i.id
        AND c.status NOT IN ('verified','closed')
    )
  )
  FROM incidents i
  LEFT JOIN incident_types it ON it.id = i.incident_type_id
  LEFT JOIN severity_levels sl ON sl.id = i.severity_level_id
  LEFT JOIN sites s ON s.id = i.site_id
  LEFT JOIN departments d ON d.id = i.department_id
  LEFT JOIN user_profiles up ON up.id = i.submitted_by
  WHERE i.id = p_incident_id;
$$;
