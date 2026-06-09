-- =============================================================
-- BACKGROUND CHECKS MODULE: Triggers
-- =============================================================

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────────────────────────

CREATE TRIGGER trg_bgc_org_prov_updated_at
  BEFORE UPDATE ON bgc_organisation_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_consent_tmpl_updated_at
  BEFORE UPDATE ON bgc_consent_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_role_req_updated_at
  BEFORE UPDATE ON bgc_role_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_pkg_updated_at
  BEFORE UPDATE ON bgc_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_order_updated_at
  BEFORE UPDATE ON bgc_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_result_updated_at
  BEFORE UPDATE ON bgc_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_adverse_updated_at
  BEFORE UPDATE ON bgc_adverse_action_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_dispute_updated_at
  BEFORE UPDATE ON bgc_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_ref_tmpl_updated_at
  BEFORE UPDATE ON bgc_reference_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_ref_req_updated_at
  BEFORE UPDATE ON bgc_reference_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_rev_sched_updated_at
  BEFORE UPDATE ON bgc_reverification_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bgc_rev_evt_updated_at
  BEFORE UPDATE ON bgc_reverification_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_worker_lic_updated_at
  BEFORE UPDATE ON worker_licences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── SYNC hires.bgc_status WHEN PACKAGE STATUS CHANGES ───────────────────────

CREATE OR REPLACE FUNCTION sync_hire_bgc_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE hires
  SET    bgc_status = NEW.status::text,
         updated_at = now()
  WHERE  bgc_package_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_hire_bgc_status
  AFTER UPDATE OF status ON bgc_packages
  FOR EACH ROW EXECUTE FUNCTION sync_hire_bgc_status();

-- ─── NOTIFY: CONSENT REQUESTED ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_bgc_consent_requested()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'consent_pending' AND
     (OLD.status IS NULL OR OLD.status::text <> 'consent_pending') THEN
    BEGIN
      PERFORM create_notification(
        'bgc.consent_requested'::text,
        NEW.organisation_id,
        NULL,
        'bgc_package'::text,
        NEW.id,
        jsonb_build_object(
          'candidate_name',    COALESCE(NEW.candidate_first_name || ' ' || NEW.candidate_last_name, 'Candidate'),
          'position_title',    COALESCE(NEW.position_title, 'Unknown Position'),
          'package_number',    COALESCE(NEW.package_number, NEW.id::text)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_bgc_consent_requested
  AFTER INSERT OR UPDATE OF status ON bgc_packages
  FOR EACH ROW EXECUTE FUNCTION notify_on_bgc_consent_requested();

-- ─── NOTIFY: CONSENT GIVEN ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_bgc_consent_given()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'consent_given' AND
     OLD.status::text <> 'consent_given' THEN
    BEGIN
      PERFORM create_notification(
        'bgc.consent_given'::text,
        NEW.organisation_id,
        NULL,
        'bgc_package'::text,
        NEW.id,
        jsonb_build_object(
          'candidate_name',    COALESCE(NEW.candidate_first_name || ' ' || NEW.candidate_last_name, 'Candidate'),
          'position_title',    COALESCE(NEW.position_title, 'Unknown Position'),
          'package_number',    COALESCE(NEW.package_number, NEW.id::text)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_bgc_consent_given
  AFTER UPDATE OF status ON bgc_packages
  FOR EACH ROW EXECUTE FUNCTION notify_on_bgc_consent_given();

-- ─── NOTIFY: RESULT RECEIVED ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_bgc_result_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pkg  bgc_packages%ROWTYPE;
  v_ord  bgc_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_ord FROM bgc_orders WHERE id = NEW.order_id;
  SELECT * INTO v_pkg FROM bgc_packages WHERE id = v_ord.package_id;

  BEGIN
    PERFORM create_notification(
      'bgc.result_received'::text,
      v_pkg.organisation_id,
      NULL,
      'bgc_package'::text,
      v_pkg.id,
      jsonb_build_object(
        'candidate_name',    COALESCE(v_pkg.candidate_first_name || ' ' || v_pkg.candidate_last_name, 'Candidate'),
        'check_type',        v_ord.check_type::text,
        'result_summary',    NEW.result_summary::text,
        'package_number',    COALESCE(v_pkg.package_number, v_pkg.id::text)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_bgc_result_received
  AFTER INSERT ON bgc_results
  FOR EACH ROW EXECUTE FUNCTION notify_on_bgc_result_received();

-- ─── NOTIFY: ADVERSE ACTION REQUIRED ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_bgc_adverse_action()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pkg bgc_packages%ROWTYPE;
BEGIN
  SELECT * INTO v_pkg FROM bgc_packages WHERE id = NEW.package_id;

  BEGIN
    PERFORM create_notification(
      'bgc.adverse_action_required'::text,
      NEW.organisation_id,
      NULL,
      'bgc_package'::text,
      NEW.package_id,
      jsonb_build_object(
        'candidate_name',    COALESCE(v_pkg.candidate_first_name || ' ' || v_pkg.candidate_last_name, 'Candidate'),
        'notice_type',       NEW.notice_type::text,
        'package_number',    COALESCE(v_pkg.package_number, v_pkg.id::text),
        'dispute_window_closes_at', COALESCE(NEW.dispute_window_closes_at::text, '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_bgc_adverse_action
  AFTER INSERT ON bgc_adverse_action_notices
  FOR EACH ROW EXECUTE FUNCTION notify_on_bgc_adverse_action();

-- ─── AUTO-ADVANCE PACKAGE STATUS WHEN ALL ORDERS COMPLETE ────────────────────

CREATE OR REPLACE FUNCTION check_bgc_package_completion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total   integer;
  v_done    integer;
BEGIN
  SELECT COUNT(*)        INTO v_total FROM bgc_orders WHERE package_id = NEW.package_id;
  SELECT COUNT(*) INTO v_done
  FROM bgc_orders
  WHERE package_id = NEW.package_id
    AND status IN ('completed','adjudicated');

  IF v_total > 0 AND v_done = v_total THEN
    UPDATE bgc_packages
    SET    status = 'review_pending', updated_at = now()
    WHERE  id = NEW.package_id
      AND  status NOT IN ('review_pending','adjudicated','complete','withdrawn');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bgc_check_completion
  AFTER UPDATE OF status ON bgc_orders
  FOR EACH ROW EXECUTE FUNCTION check_bgc_package_completion();
