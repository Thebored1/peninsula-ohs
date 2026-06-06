-- =============================================================
-- Wire incident notifications (Gap 2)
-- Trigger: fire create_notification() when an incident is created
-- Trigger: fire create_notification() when a CAPA is created with a due date
-- =============================================================

-- -------------------------------------------------------------
-- INCIDENT INSERT → incidents.submitted
-- Resolves: incident type name, site name, reporter name,
--           incident date, work area name, reference number
-- The EXCEPTION block ensures a notification failure never
-- blocks the original INSERT.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_incident_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_incident_type_name text;
  v_work_area_name     text;
BEGIN
  -- Resolve incident type name from lookup table
  SELECT name INTO v_incident_type_name
  FROM incident_types
  WHERE id = NEW.incident_type_id;

  -- Resolve work area name from lookup table (if present)
  IF NEW.work_area_id IS NOT NULL THEN
    SELECT name INTO v_work_area_name
    FROM work_areas
    WHERE id = NEW.work_area_id;
  END IF;

  PERFORM create_notification(
    'incidents.submitted'::text,
    NEW.organisation_id,
    NEW.site_id,
    'incident'::text,
    NEW.id,
    jsonb_build_object(
      'incident_type',   COALESCE(v_incident_type_name, 'Incident'),
      'site_name',       COALESCE((SELECT name FROM sites WHERE id = NEW.site_id), 'Unknown site'),
      'reporter_name',   COALESCE(
                           (SELECT first_name || ' ' || last_name
                            FROM user_profiles
                            WHERE id = NEW.created_by),
                           'Unknown'
                         ),
      'incident_date',   COALESCE(NEW.incident_date::text, now()::date::text),
      'work_area_name',  COALESCE(v_work_area_name, ''),
      'reference',       COALESCE(NEW.incident_number, NEW.id::text)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block incident creation due to notification failure
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_on_incident
  AFTER INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION notify_on_incident_insert();

-- -------------------------------------------------------------
-- CAPA (incident_capa) INSERT → incidents.action_overdue
-- Only fires when a due_date is provided so that an overdue
-- notification can be scheduled / sent at the right time.
-- Uses created_by (the person who created the CAPA) as assigner.
-- source reference resolved from the parent incident number.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_capa_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_incident_ref text;
BEGIN
  IF NEW.due_date IS NOT NULL THEN
    -- Resolve incident reference number
    SELECT incident_number INTO v_incident_ref
    FROM incidents
    WHERE id = NEW.incident_id;

    PERFORM create_notification(
      'incidents.action_overdue'::text,
      NEW.organisation_id,
      NULL,
      'action_item'::text,
      NEW.id,
      jsonb_build_object(
        'action_title',        NEW.title,
        'due_date',            NEW.due_date::text,
        'incident_reference',  COALESCE(v_incident_ref, NEW.incident_id::text),
        'assigner_name',       COALESCE(
                                 (SELECT first_name || ' ' || last_name
                                  FROM user_profiles
                                  WHERE id = NEW.created_by),
                                 'System'
                               )
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_on_capa
  AFTER INSERT ON incident_capa
  FOR EACH ROW EXECUTE FUNCTION notify_on_capa_insert();
