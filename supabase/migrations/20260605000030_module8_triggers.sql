-- =============================================================
-- MODULE 8: Triggers & Functions — Asset Management
-- =============================================================

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_amr_updated_at
  BEFORE UPDATE ON asset_maintenance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- ASSET NUMBER GENERATION — ASSET-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION generate_asset_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.asset_number IS NULL THEN
    NEW.asset_number := next_reference_number('asset', NEW.organisation_id, 'ASSET');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_asset_number
  BEFORE INSERT ON assets FOR EACH ROW EXECUTE FUNCTION generate_asset_number();

-- =============================================================
-- MAINTENANCE RECORD NUMBER — MAINT-YYYY-NNNNN
-- Also advances the asset's next_maintenance_due and
-- last_maintained_at when a maintenance record is created.
-- =============================================================

CREATE OR REPLACE FUNCTION generate_maintenance_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.maintenance_number IS NULL THEN
    NEW.maintenance_number := next_reference_number('maintenance', NEW.organisation_id, 'MAINT');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_maintenance_number
  BEFORE INSERT ON asset_maintenance_records FOR EACH ROW EXECUTE FUNCTION generate_maintenance_number();

CREATE OR REPLACE FUNCTION sync_asset_after_maintenance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE assets
  SET last_maintained_at    = NEW.performed_at::date,
      next_maintenance_due  = COALESCE(NEW.next_maintenance_due, next_maintenance_due),
      updated_at            = now()
  WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_asset_after_maintenance
  AFTER INSERT ON asset_maintenance_records
  FOR EACH ROW EXECUTE FUNCTION sync_asset_after_maintenance();

-- =============================================================
-- OUT-OF-SERVICE FLAGGING
-- When an asset is put out of service, update its status
-- to the 'out_of_service' status record and notify.
-- When returned, restore to 'operational'.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_out_of_service_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_oos_status_id     uuid;
  v_operational_id    uuid;
  v_asset             record;
BEGIN
  SELECT id INTO v_oos_status_id   FROM asset_statuses WHERE code = 'out_of_service' LIMIT 1;
  SELECT id INTO v_operational_id  FROM asset_statuses WHERE code = 'operational'    LIMIT 1;
  SELECT * INTO v_asset FROM assets WHERE id = NEW.asset_id;

  IF TG_OP = 'INSERT' THEN
    -- Flag asset OOS
    UPDATE assets SET status_id = v_oos_status_id, updated_at = now()
    WHERE id = NEW.asset_id;

    PERFORM create_notification(
      'assets.out_of_service',
      NEW.organisation_id, v_asset.site_id,
      'asset', NEW.asset_id,
      jsonb_build_object(
        'asset_number', v_asset.asset_number,
        'asset_name',   v_asset.name,
        'reason',       NEW.reason,
        'reporter_id',  NEW.put_out_of_service_by
      )
    );
  ELSIF TG_OP = 'UPDATE'
        AND NEW.returned_to_service_at IS NOT NULL
        AND OLD.returned_to_service_at IS NULL
  THEN
    -- Return to service — restore operational status
    UPDATE assets SET status_id = v_operational_id, updated_at = now()
    WHERE id = NEW.asset_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_oos_event
  AFTER INSERT OR UPDATE ON asset_out_of_service_events
  FOR EACH ROW EXECUTE FUNCTION handle_out_of_service_event();

-- =============================================================
-- INSPECTION SYNC — update asset.last_inspected_at when
-- an inspection against this asset is submitted.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_asset_after_inspection()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' AND NEW.asset_id IS NOT NULL THEN
    UPDATE assets
    SET last_inspected_at  = NEW.completed_at::date,
        next_inspection_due = CASE
          WHEN inspection_frequency = 'daily'     THEN CURRENT_DATE + interval '1 day'
          WHEN inspection_frequency = 'weekly'    THEN CURRENT_DATE + interval '7 days'
          WHEN inspection_frequency = 'monthly'   THEN CURRENT_DATE + interval '1 month'
          WHEN inspection_frequency = 'quarterly' THEN CURRENT_DATE + interval '3 months'
          WHEN inspection_frequency = 'annually'  THEN CURRENT_DATE + interval '1 year'
          ELSE next_inspection_due
        END,
        updated_at = now()
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_asset_after_inspection
  AFTER UPDATE OF status ON inspections
  FOR EACH ROW EXECUTE FUNCTION sync_asset_after_inspection();

-- =============================================================
-- OVERDUE ALERTS — daily sweep
-- =============================================================

CREATE OR REPLACE FUNCTION mark_overdue_asset_inspections()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  -- Notify for assets with overdue inspections
  UPDATE assets
  SET updated_at = now()   -- touch record so Realtime pushes to dashboard
  WHERE next_inspection_due < CURRENT_DATE AND is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================
-- ROW VERSIONING
-- =============================================================

CREATE TRIGGER version_assets
  AFTER INSERT OR UPDATE OR DELETE ON assets
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();

CREATE TRIGGER version_asset_maintenance_records
  AFTER INSERT OR UPDATE OR DELETE ON asset_maintenance_records
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();
