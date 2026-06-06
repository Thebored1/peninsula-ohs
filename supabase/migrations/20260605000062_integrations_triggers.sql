-- =============================================================
-- INTEGRATIONS: Triggers & Functions
-- =============================================================

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- WEBHOOK FAN-OUT
-- Fires after every notification INSERT. Looks up active webhook
-- endpoints subscribed to that event code and queues a delivery
-- row for each. The delivery worker (Edge Function / pg_cron) then
-- makes the actual HTTP calls.
--
-- This is intentionally decoupled — no module needs to know about
-- webhooks. Every event that creates a notification auto-fans out.
-- =============================================================

CREATE OR REPLACE FUNCTION queue_webhook_deliveries()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO webhook_deliveries (
    endpoint_id, organisation_id, event_type_code,
    notification_id, source_type, source_id, payload, status
  )
  SELECT
    e.id,
    NEW.organisation_id,
    NEW.event_type,
    NEW.id,
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'event',           NEW.event_type,
      'organisation_id', NEW.organisation_id,
      'site_id',         NEW.site_id,
      'entity_type',     NEW.entity_type,
      'entity_id',       NEW.entity_id,
      'data',            NEW.data,
      'created_at',      NEW.created_at
    ),
    'pending'
  FROM webhook_endpoints     e
  JOIN webhook_endpoint_subscriptions wes ON wes.endpoint_id  = e.id
  JOIN webhook_event_types   wet ON wet.id = wes.event_type_id
  WHERE e.organisation_id = NEW.organisation_id
    AND e.is_active        = true
    AND wes.is_active      = true
    AND wet.code           = NEW.event_type;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_queue_webhook_deliveries
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION queue_webhook_deliveries();

-- =============================================================
-- WEBHOOK DELIVERY STATUS SYNC
-- When a delivery row is inserted as 'delivered', update the
-- parent endpoint's last_success_at and reset failure_count.
-- When 'abandoned', increment failure_count and set last_failure_at.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_webhook_endpoint_health()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE webhook_endpoints
    SET last_success_at = now(),
        failure_count   = 0,
        updated_at      = now()
    WHERE id = NEW.endpoint_id;

  ELSIF NEW.status = 'abandoned' THEN
    UPDATE webhook_endpoints
    SET last_failure_at = now(),
        failure_count   = failure_count + 1,
        updated_at      = now()
    WHERE id = NEW.endpoint_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_webhook_endpoint_health
  AFTER INSERT ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION sync_webhook_endpoint_health();

-- =============================================================
-- API KEY LOOKUP
-- Used by the API gateway (Edge Function) to authenticate requests.
-- Returns the api_key row if the provided hash matches an active key.
-- The caller hashes the incoming 'Authorization: Bearer sk_...' value
-- and passes the hash here.
-- =============================================================

CREATE OR REPLACE FUNCTION lookup_api_key(p_key_hash text)
RETURNS TABLE (
  key_id          uuid,
  organisation_id uuid,
  environment     text,
  scopes          text[]
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ak.id,
    ak.organisation_id,
    ak.environment,
    ARRAY_AGG(aks.scope_code) AS scopes
  FROM api_keys ak
  LEFT JOIN api_key_scopes aks ON aks.api_key_id = ak.id
  WHERE ak.key_hash  = p_key_hash
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now())
  GROUP BY ak.id, ak.organisation_id, ak.environment;
$$;

-- =============================================================
-- API KEY LAST USED STAMP
-- Called by the API gateway after a successful key lookup.
-- =============================================================

CREATE OR REPLACE FUNCTION stamp_api_key_last_used(p_key_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE api_keys SET last_used_at = now() WHERE key_hash = p_key_hash;
$$;

-- =============================================================
-- INTEGRATION SYNC STATUS SYNC
-- After a sync log is inserted / completes, update the parent
-- integration's last_sync_at and last_sync_status.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_integration_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('completed','partial','failed') THEN
    UPDATE integrations
    SET last_sync_at     = NEW.completed_at,
        last_sync_status = CASE NEW.status
          WHEN 'completed' THEN 'success'
          WHEN 'partial'   THEN 'partial'
          ELSE 'failed'
        END,
        last_sync_error  = CASE WHEN NEW.status = 'failed'
                           THEN (NEW.error_details->>'message')::text END,
        updated_at       = now()
    WHERE id = NEW.integration_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_integration_status
  AFTER INSERT ON integration_sync_logs
  FOR EACH ROW EXECUTE FUNCTION sync_integration_status();
