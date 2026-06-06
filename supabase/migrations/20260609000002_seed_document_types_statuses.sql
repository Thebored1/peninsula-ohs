-- Seed document_types (global lookup — no organisation_id)
INSERT INTO document_types (code, name, description, requires_review, review_cycle_days, display_order, is_active)
VALUES
  ('sop',        'Standard Operating Procedure (SOP)',  'Step-by-step procedure for performing a task safely',          true,  365, 1,  true),
  ('swms',       'Safe Work Method Statement (SWMS)',    'Identifies high-risk construction work and required controls', true,  365, 2,  true),
  ('policy',     'Policy',                               'Organisational commitment and intent document',                true,  730, 3,  true),
  ('procedure',  'Procedure',                            'Detailed process description for a business activity',        true,  365, 4,  true),
  ('work_instr', 'Work Instruction',                     'Task-level instruction for a specific activity',              false, 365, 5,  true),
  ('risk_assess','Risk Assessment',                      'Formal identification and evaluation of hazards and risks',   true,  365, 6,  true),
  ('emergency',  'Emergency Plan',                       'Emergency response and evacuation plan',                      true,  365, 7,  true),
  ('induction',  'Induction Material',                   'Onboarding and safety induction content',                     false, 365, 8,  true),
  ('training',   'Training Material',                    'Training course content or reference material',               false, 365, 9,  true),
  ('permit_tmpl','Permit Template',                      'Template used to generate permits to work',                   true,  365, 10, true),
  ('form',       'Form / Template',                      'Blank form or template for recording information',            false, 730, 11, true),
  ('register',   'Register',                             'Record-keeping register (chemicals, assets, etc.)',           false, 365, 12, true),
  ('other',      'Other',                                'General document not covered by other types',                 false, 730, 13, true)
ON CONFLICT (code) DO NOTHING;

-- Seed document_statuses (global lookup — no organisation_id)
-- is_editable: content can be changed; is_live: workers can access this version
INSERT INTO document_statuses (code, name, description, is_editable, is_live, colour_code, display_order, is_active)
VALUES
  ('draft',      'Draft',      'Being written or edited — not visible to workers',              true,  false, '#6f6f6f', 1, true),
  ('in_review',  'In Review',  'Submitted for approval — locked from editing',                  false, false, '#0f62fe', 2, true),
  ('approved',   'Approved',   'Approved but not yet published to workers',                      false, false, '#007d79', 3, true),
  ('published',  'Published',  'Live and visible to all required workers',                       false, true,  '#24a148', 4, true),
  ('superseded', 'Superseded', 'Replaced by a newer version — retained for reference',           false, false, '#8a3ffc', 5, true),
  ('archived',   'Archived',   'Retired document — no longer active or visible',                 false, false, '#393939', 6, true)
ON CONFLICT (code) DO NOTHING;
