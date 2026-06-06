-- =============================================================
-- MODULE 14: Triggers & Functions — Chemical Management
-- =============================================================

CREATE TRIGGER trg_chemicals_updated_at
  BEFORE UPDATE ON chemicals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_csds_updated_at
  BEFORE UPDATE ON chemical_sds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- CHEMICAL NUMBER — CHEM-YYYY-NNNNN
-- Also auto-populates qr_code_data with the chemical UUID.
-- =============================================================

CREATE OR REPLACE FUNCTION generate_chemical_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.chemical_number IS NULL THEN
    NEW.chemical_number := next_reference_number('chemical', NEW.organisation_id, 'CHEM');
  END IF;
  -- QR code payload: the chemical's own UUID is enough for the mobile app
  IF NEW.qr_code_data IS NULL THEN
    NEW.qr_code_data := NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_chemical_number
  BEFORE INSERT ON chemicals FOR EACH ROW EXECUTE FUNCTION generate_chemical_number();

-- =============================================================
-- SDS VERSION MANAGEMENT
-- When a new SDS is inserted with status='current', supersede
-- all previous current SDS records and update chemicals.current_sds_id.
-- =============================================================

CREATE OR REPLACE FUNCTION manage_sds_versions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'current' THEN
    -- Archive any existing current SDS
    UPDATE chemical_sds
    SET status    = 'superseded',
        updated_at = now()
    WHERE chemical_id = NEW.chemical_id
      AND id        != NEW.id
      AND status    = 'current';

    -- Set the chemical's current_sds_id
    UPDATE chemicals
    SET current_sds_id   = NEW.id,
        next_review_date = COALESCE(NEW.next_review_date,
                                    CURRENT_DATE + (review_frequency_days || ' days')::interval),
        updated_at       = now()
    WHERE id = NEW.chemical_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manage_sds_versions
  AFTER INSERT OR UPDATE OF status ON chemical_sds
  FOR EACH ROW EXECUTE FUNCTION manage_sds_versions();

-- =============================================================
-- INVENTORY BALANCE MAINTENANCE
-- After a transaction is recorded, update the balance in
-- chemical_inventory using INSERT … ON CONFLICT DO UPDATE
-- so the first transaction creates the inventory row.
-- =============================================================

CREATE OR REPLACE FUNCTION update_inventory_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_delta decimal(12,4);
BEGIN
  -- Determine whether this transaction increases (+) or decreases (-) stock
  v_delta := CASE NEW.transaction_type
    WHEN 'received'            THEN  NEW.quantity
    WHEN 'transferred_in'      THEN  NEW.quantity
    WHEN 'stocktake_adjustment'THEN  NEW.quantity   -- can be positive or negative; caller passes signed value
    WHEN 'used'                THEN -NEW.quantity
    WHEN 'disposed'            THEN -NEW.quantity
    WHEN 'transferred_out'     THEN -NEW.quantity
    WHEN 'expired_disposal'    THEN -NEW.quantity
    ELSE 0
  END;

  INSERT INTO chemical_inventory (chemical_id, storage_location_id, organisation_id, quantity_on_hand, unit, updated_at)
  VALUES (NEW.chemical_id, NEW.storage_location_id, NEW.organisation_id,
          GREATEST(0, v_delta), NEW.unit, now())
  ON CONFLICT (chemical_id, storage_location_id) DO UPDATE
    SET quantity_on_hand = GREATEST(0, chemical_inventory.quantity_on_hand + v_delta),
        updated_at       = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_inventory_balance
  AFTER INSERT ON chemical_inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION update_inventory_balance();

-- =============================================================
-- COMPATIBILITY CHECK
-- RPC: returns incompatibility details between two chemicals,
-- or NULL if they are compatible.
-- =============================================================

CREATE OR REPLACE FUNCTION check_chemical_compatibility(
  p_chem_a uuid,
  p_chem_b uuid
) RETURNS TABLE (
  incompatibility_type text,
  description          text,
  source               text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT incompatibility_type, description, source
  FROM   chemical_compatibility_rules
  WHERE  is_active = true
    AND  (
           (chemical_a_id = LEAST(p_chem_a, p_chem_b)
            AND chemical_b_id = GREATEST(p_chem_a, p_chem_b))
         );
$$;

-- =============================================================
-- SDS REVIEW NOTIFICATIONS — daily sweep
-- Alerts HSE officer when an SDS is approaching its review date.
-- =============================================================

CREATE OR REPLACE FUNCTION notify_sds_review_due(p_days_ahead integer DEFAULT 30)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer := 0; v_rec record;
BEGIN
  FOR v_rec IN
    SELECT c.id, c.organisation_id, c.name AS chem_name, c.chemical_number,
           s.next_review_date
    FROM chemical_sds s
    JOIN chemicals    c ON c.id = s.chemical_id
    WHERE s.status = 'current'
      AND s.next_review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
      AND c.is_active = true
  LOOP
    PERFORM create_notification(
      'chemicals.sds_review_due',
      v_rec.organisation_id, NULL,
      'chemical', v_rec.id,
      jsonb_build_object(
        'chemical_number',  v_rec.chemical_number,
        'chemical_name',    v_rec.chem_name,
        'review_due',       v_rec.next_review_date::text
      )
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- =============================================================
-- LOW STOCK ALERT
-- Fired when inventory drops below 20% of max_quantity.
-- =============================================================

CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_chem record;
BEGIN
  IF NEW.max_quantity IS NULL OR NEW.max_quantity = 0 THEN RETURN NEW; END IF;

  IF NEW.quantity_on_hand < (NEW.max_quantity * 0.2)
     AND (OLD.quantity_on_hand IS NULL OR OLD.quantity_on_hand >= (NEW.max_quantity * 0.2))
  THEN
    SELECT c.organisation_id, c.name, c.chemical_number
    INTO   v_chem FROM chemicals c WHERE c.id = NEW.chemical_id;

    PERFORM create_notification(
      'chemicals.low_stock',
      v_chem.organisation_id, NULL,
      'chemical', NEW.chemical_id,
      jsonb_build_object(
        'chemical_number',  v_chem.chemical_number,
        'chemical_name',    v_chem.name,
        'quantity_on_hand', NEW.quantity_on_hand,
        'max_quantity',     NEW.max_quantity
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_low_stock
  AFTER INSERT OR UPDATE OF quantity_on_hand ON chemical_inventory
  FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- Row versioning
CREATE TRIGGER version_chemicals
  AFTER INSERT OR UPDATE OR DELETE ON chemicals
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();
