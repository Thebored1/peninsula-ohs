-- =============================================================
-- MODULE 9: Triggers & Functions — Audit Management
-- =============================================================

CREATE TRIGGER trg_audits_updated_at
  BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_audit_templates_updated_at
  BEFORE UPDATE ON audit_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_audit_findings_updated_at
  BEFORE UPDATE ON audit_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- AUDIT NUMBER — AUDIT-YYYY-NNNNN
-- =============================================================

CREATE OR REPLACE FUNCTION generate_audit_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.audit_number IS NULL THEN
    NEW.audit_number := next_reference_number('audit', NEW.organisation_id, 'AUDIT');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_audit_number
  BEFORE INSERT ON audits FOR EACH ROW EXECUTE FUNCTION generate_audit_number();

-- =============================================================
-- POPULATE AUDIT FROM TEMPLATE
-- When an audit is inserted with template_id set, copies
-- sections and criteria from the template into the audit.
-- =============================================================

CREATE OR REPLACE FUNCTION populate_audit_from_template()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tmpl_section  record;
  v_tmpl_crit     record;
  v_section_id    uuid;
BEGIN
  IF NEW.template_id IS NULL THEN RETURN NEW; END IF;

  FOR v_tmpl_section IN
    SELECT * FROM audit_template_sections WHERE template_id = NEW.template_id ORDER BY order_index
  LOOP
    INSERT INTO audit_sections (audit_id, template_section_id, organisation_id, title, description, order_index)
    VALUES (NEW.id, v_tmpl_section.id, NEW.organisation_id, v_tmpl_section.title, v_tmpl_section.description, v_tmpl_section.order_index)
    RETURNING id INTO v_section_id;

    FOR v_tmpl_crit IN
      SELECT * FROM audit_template_criteria WHERE section_id = v_tmpl_section.id ORDER BY order_index
    LOOP
      INSERT INTO audit_criteria (audit_id, section_id, template_criterion_id, organisation_id,
                                  reference_number, criterion_text, guidance, evidence_required, order_index)
      VALUES (NEW.id, v_section_id, v_tmpl_crit.id, NEW.organisation_id,
              v_tmpl_crit.reference_number, v_tmpl_crit.criterion_text,
              v_tmpl_crit.guidance, v_tmpl_crit.evidence_required, v_tmpl_crit.order_index);
    END LOOP;
  END LOOP;

  -- Criteria from template with no section
  FOR v_tmpl_crit IN
    SELECT * FROM audit_template_criteria WHERE template_id = NEW.template_id AND section_id IS NULL ORDER BY order_index
  LOOP
    INSERT INTO audit_criteria (audit_id, section_id, template_criterion_id, organisation_id,
                                reference_number, criterion_text, guidance, evidence_required, order_index)
    VALUES (NEW.id, NULL, v_tmpl_crit.id, NEW.organisation_id,
            v_tmpl_crit.reference_number, v_tmpl_crit.criterion_text,
            v_tmpl_crit.guidance, v_tmpl_crit.evidence_required, v_tmpl_crit.order_index);
  END LOOP;

  -- Update the criteria counts
  UPDATE audits
  SET total_criteria = (SELECT COUNT(*) FROM audit_criteria WHERE audit_id = NEW.id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_audit_from_template
  AFTER INSERT ON audits
  FOR EACH ROW EXECUTE FUNCTION populate_audit_from_template();

-- =============================================================
-- FINDING SUMMARY COUNTERS
-- After any finding insert/update, recalculate the audit's
-- summary counts.
-- =============================================================

CREATE OR REPLACE FUNCTION recalculate_audit_finding_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE audits
  SET assessed_criteria   = (SELECT COUNT(*) FROM audit_findings WHERE audit_id = NEW.audit_id),
      conformance_count   = (
        SELECT COUNT(*) FROM audit_findings af
        JOIN audit_finding_outcomes fo ON fo.id = af.outcome_id
        WHERE af.audit_id = NEW.audit_id AND fo.code = 'conformance'
      ),
      minor_nc_count      = (
        SELECT COUNT(*) FROM audit_findings af
        JOIN audit_finding_outcomes fo ON fo.id = af.outcome_id
        WHERE af.audit_id = NEW.audit_id AND fo.code = 'minor_nc'
      ),
      major_nc_count      = (
        SELECT COUNT(*) FROM audit_findings af
        JOIN audit_finding_outcomes fo ON fo.id = af.outcome_id
        WHERE af.audit_id = NEW.audit_id AND fo.code = 'major_nc'
      ),
      observation_count   = (
        SELECT COUNT(*) FROM audit_findings af
        JOIN audit_finding_outcomes fo ON fo.id = af.outcome_id
        WHERE af.audit_id = NEW.audit_id AND fo.code = 'observation'
      ),
      ofi_count           = (
        SELECT COUNT(*) FROM audit_findings af
        JOIN audit_finding_outcomes fo ON fo.id = af.outcome_id
        WHERE af.audit_id = NEW.audit_id AND fo.code = 'opportunity_for_improvement'
      ),
      updated_at          = now()
  WHERE id = NEW.audit_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalculate_audit_findings
  AFTER INSERT OR UPDATE ON audit_findings
  FOR EACH ROW EXECUTE FUNCTION recalculate_audit_finding_counts();

-- =============================================================
-- CREATE ACTION FOR FINDING
-- RPC called by app when auditor decides to raise a CAPA
-- for a non-conformance or OFI.
-- =============================================================

CREATE OR REPLACE FUNCTION create_audit_finding_action(
  p_finding_id  uuid,
  p_title       text    DEFAULT NULL,
  p_assigned_to uuid    DEFAULT NULL,
  p_priority    text    DEFAULT 'medium',
  p_due_date    date    DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_finding   record;
  v_audit     record;
  v_action_id uuid;
  v_title     text;
BEGIN
  SELECT af.*, afo.name AS outcome_name
  INTO v_finding
  FROM audit_findings af
  JOIN audit_finding_outcomes afo ON afo.id = af.outcome_id
  WHERE af.id = p_finding_id;

  SELECT * INTO v_audit FROM audits WHERE id = v_finding.audit_id;

  v_title := COALESCE(p_title, v_finding.outcome_name || ': ' || LEFT(v_finding.finding_text, 120));

  INSERT INTO actions (
    organisation_id,
    action_type, priority,
    source_type, source_id, source_reference,
    title, description,
    assigned_to, assigned_by, assigned_at,
    due_date, verification_required, created_by
  ) VALUES (
    v_audit.organisation_id,
    'corrective', p_priority,
    'audit', v_finding.audit_id, v_audit.audit_number,
    v_title, COALESCE(v_finding.finding_text, v_title),
    p_assigned_to, auth.uid(), CASE WHEN p_assigned_to IS NOT NULL THEN now() END,
    p_due_date, true, auth.uid()
  ) RETURNING id INTO v_action_id;

  INSERT INTO audit_finding_actions (finding_id, action_id, organisation_id, created_by)
  VALUES (p_finding_id, v_action_id, v_audit.organisation_id, auth.uid());

  UPDATE audit_findings SET action_created = true, updated_at = now() WHERE id = p_finding_id;

  RETURN v_action_id;
END;
$$;

-- =============================================================
-- AUDIT STATUS NOTIFICATIONS
-- =============================================================

CREATE OR REPLACE FUNCTION notify_audit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  PERFORM create_notification(
    'audits.' || NEW.status,
    NEW.organisation_id, NULL,
    'audit', NEW.id,
    jsonb_build_object(
      'audit_number', NEW.audit_number,
      'audit_title',  NEW.title,
      'reporter_id',  NEW.lead_auditor_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_audit_status
  AFTER UPDATE OF status ON audits
  FOR EACH ROW EXECUTE FUNCTION notify_audit_status_change();

-- Row versioning
CREATE TRIGGER version_audits
  AFTER INSERT OR UPDATE OR DELETE ON audits
  FOR EACH ROW EXECUTE FUNCTION row_version_trigger_function();
