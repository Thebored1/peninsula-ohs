-- =============================================================
-- HIRING MODULE: HR Document Templates — Schema
-- =============================================================
-- Stores reusable document templates for the hiring workflow.
-- NULL organisation_id = EXXIO system template (all orgs).
-- Non-NULL = org-created custom template.
-- =============================================================

CREATE TABLE hr_document_templates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  template_type         text        NOT NULL CHECK (template_type IN (
                          'offer_letter',
                          'employment_contract',
                          'nda',
                          'policy_acknowledgement',
                          'probation_notice',
                          'custom'
                        )),
  name                  text        NOT NULL,
  description           text,
  body_content          text        NOT NULL,
  province_clauses      jsonb,
  applicable_provinces  text[],
  variable_definitions  jsonb       NOT NULL DEFAULT '[]',
  is_active             boolean     NOT NULL DEFAULT true,
  is_system_template    boolean     NOT NULL DEFAULT false,
  version               text        NOT NULL DEFAULT '1.0',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_hrdt_org        ON hr_document_templates(organisation_id);
CREATE INDEX idx_hrdt_type       ON hr_document_templates(template_type);
CREATE INDEX idx_hrdt_active     ON hr_document_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_hrdt_system     ON hr_document_templates(is_system_template) WHERE is_system_template = true;
