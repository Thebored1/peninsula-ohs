-- =============================================================
-- HIRING MODULE: HR Document Templates — System Seed Data
-- =============================================================
-- 4 Peninsula-managed templates available to all organisations.
-- province_clauses JSON contains jurisdiction-specific text
-- that is appended to the document body for the hire's province.
-- =============================================================

INSERT INTO hr_document_templates
  (organisation_id, template_type, name, description, body_content, province_clauses,
   variable_definitions, is_active, is_system_template, version)
VALUES

-- ─── 1. LETTER OF OFFER ───────────────────────────────────────────────────────
(
  NULL,
  'offer_letter',
  'Letter of Offer',
  'Standard letter extending a job offer to a candidate. Covers role, start date, compensation, and reporting structure.',
  E'{{employer_name}}\n\nDate: {{document_date}}\n\nDear {{employee_full_name}},\n\nWe are pleased to offer you the position of {{position_title}} with {{employer_name}}, commencing on {{start_date}}.\n\nPOSITION DETAILS\n\nTitle: {{position_title}}\nEmployment Type: {{employment_type}}\nLocation: {{site_name}}\nReporting To: {{reports_to_name}}\nStart Date: {{start_date}}\n\nCOMPENSATION\n\n{{compensation_summary}}\n\nThis offer is contingent upon satisfactory completion of applicable pre-employment checks and your ability to legally work in Canada.\n\nPlease indicate your acceptance of this offer by signing and returning this letter by {{offer_expiry_date}}.\n\nWe look forward to welcoming you to our team.\n\nSincerely,\n\n{{employer_signatory_name}}\n{{employer_signatory_title}}\n{{employer_name}}\n\n─────────────────────────────────────────────────────────────\nACCEPTANCE\n\nI, {{employee_full_name}}, accept the offer of employment as described above.\n\nSignature: _______________________________  Date: ___________',
  '{
    "ON": "This offer is governed by the Employment Standards Act, 2000 (Ontario) and applicable regulations. The probation period shall not exceed 3 months (90 days) from the start date.",
    "BC": "This offer is governed by the Employment Standards Act (British Columbia). Any probationary period shall not exceed 3 months from the start date.",
    "AB": "This offer is governed by the Employment Standards Code (Alberta). Any probationary period shall not exceed 3 months (90 days) from the start date.",
    "QC": "Cette offre est régie par la Loi sur les normes du travail (Québec). Toute période de probation ne dépassera pas 3 mois à compter de la date de début."
  }'::jsonb,
  '[
    {"key":"employer_name","label":"Employer Name","required":true},
    {"key":"document_date","label":"Document Date","required":true},
    {"key":"employee_full_name","label":"Employee Full Name","required":true},
    {"key":"position_title","label":"Position Title","required":true},
    {"key":"start_date","label":"Start Date","required":true},
    {"key":"employment_type","label":"Employment Type","required":true},
    {"key":"site_name","label":"Work Location / Site","required":true},
    {"key":"reports_to_name","label":"Reporting Manager Name","required":false},
    {"key":"compensation_summary","label":"Compensation Summary","required":true},
    {"key":"offer_expiry_date","label":"Offer Expiry Date","required":false},
    {"key":"employer_signatory_name","label":"Signatory Name","required":true},
    {"key":"employer_signatory_title","label":"Signatory Title","required":true}
  ]'::jsonb,
  true, true, '1.0'
),

-- ─── 2. EMPLOYMENT CONTRACT ───────────────────────────────────────────────────
(
  NULL,
  'employment_contract',
  'Employment Contract',
  'Comprehensive employment agreement covering all key terms and conditions of employment. Includes jurisdiction-specific clauses.',
  E'EMPLOYMENT AGREEMENT\n\nThis Employment Agreement ("Agreement") is entered into as of {{start_date}} between:\n\nEMPLOYER: {{employer_name}} ("Employer")\nEMPLOYEE: {{employee_full_name}} ("Employee")\n\n1. POSITION AND DUTIES\n\nThe Employee is hired as {{position_title}}, reporting to {{reports_to_name}}. Primary place of work: {{site_name}}.\n\n2. EMPLOYMENT TYPE\n\n{{employment_type_clause}}\n\n3. PROBATION PERIOD\n\nThe Employee will serve a probationary period of {{probation_period}} from the start date. During this period, either party may terminate employment with one week''s written notice.\n\n4. COMPENSATION\n\n{{compensation_summary}}\n\nPay is subject to applicable statutory deductions.\n\n5. HOURS OF WORK\n\nThe standard work week is {{hours_per_week}} hours. Overtime compensation will be provided in accordance with applicable employment standards legislation.\n\n6. VACATION AND STATUTORY HOLIDAYS\n\nThe Employee is entitled to vacation pay and statutory holidays as required by applicable legislation, at a minimum of {{vacation_pay_pct}}% of gross earnings.\n\n7. TERMINATION\n\nEither party may terminate this Agreement with written notice as required by applicable employment standards legislation.\n\n8. CONFIDENTIALITY\n\nThe Employee agrees to maintain the confidentiality of all proprietary information of the Employer during and after employment.\n\n9. GOVERNING LAW\n\nThis Agreement is governed by the laws of {{governing_province}}, Canada.\n\n─────────────────────────────────────────────────────────────\nSIGNATURES\n\nEmployee: _______________________________  Date: ___________\n{{employee_full_name}}\n\nEmployer: _______________________________  Date: ___________\n{{employer_signatory_name}}, {{employer_signatory_title}}',
  '{
    "ON": "ONTARIO EMPLOYMENT STANDARDS ACT NOTICE\n\nThis Agreement is subject to the Employment Standards Act, 2000 (Ontario). In the event of any conflict between this Agreement and the ESA, the ESA prevails. Upon termination (without cause), the Employee is entitled to notice or pay in lieu as set out in the ESA. The Employee acknowledges receipt of the ESA poster.",
    "BC": "BRITISH COLUMBIA EMPLOYMENT STANDARDS ACT NOTICE\n\nThis Agreement is subject to the Employment Standards Act (British Columbia). In the event of any conflict, the ESA prevails. Termination provisions comply with Part 8 of the BC ESA. The Employee is entitled to statutory minimum notice or pay in lieu upon termination without cause.",
    "AB": "ALBERTA EMPLOYMENT STANDARDS CODE NOTICE\n\nThis Agreement is subject to the Employment Standards Code (Alberta). In the event of any conflict, the Code prevails. Termination notice will be provided in accordance with Part 2, Division 8 of the Code.",
    "QC": "LOI SUR LES NORMES DU TRAVAIL (QUÉBEC)\n\nLa présente convention est soumise à la Loi sur les normes du travail (Québec). En cas de conflit entre la présente convention et la Loi, la Loi prévaut. L''employé a droit à un préavis de cessation d''emploi conformément aux articles 82 et suivants de la Loi."
  }'::jsonb,
  '[
    {"key":"employer_name","label":"Employer Name","required":true},
    {"key":"employee_full_name","label":"Employee Full Name","required":true},
    {"key":"start_date","label":"Start Date","required":true},
    {"key":"position_title","label":"Position Title","required":true},
    {"key":"reports_to_name","label":"Reporting Manager","required":false},
    {"key":"site_name","label":"Work Location","required":true},
    {"key":"employment_type_clause","label":"Employment Type Description","required":true},
    {"key":"probation_period","label":"Probation Period","required":true},
    {"key":"compensation_summary","label":"Compensation Summary","required":true},
    {"key":"hours_per_week","label":"Hours Per Week","required":false},
    {"key":"vacation_pay_pct","label":"Vacation Pay Percentage","required":true},
    {"key":"governing_province","label":"Governing Province","required":true},
    {"key":"employer_signatory_name","label":"Signatory Name","required":true},
    {"key":"employer_signatory_title","label":"Signatory Title","required":true}
  ]'::jsonb,
  true, true, '1.0'
),

-- ─── 3. NON-DISCLOSURE AGREEMENT ──────────────────────────────────────────────
(
  NULL,
  'nda',
  'Non-Disclosure Agreement (NDA)',
  'Confidentiality agreement protecting proprietary business information. Effective from start date.',
  E'NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT\n\nThis Agreement is entered into as of {{start_date}} between {{employer_name}} ("Employer") and {{employee_full_name}} ("Employee").\n\n1. CONFIDENTIAL INFORMATION\n\n"Confidential Information" means any non-public information disclosed by the Employer to the Employee in connection with their employment, including but not limited to: business strategies, client lists, financial data, trade secrets, technical information, and operational processes.\n\n2. OBLIGATIONS\n\nThe Employee agrees to:\n(a) Hold all Confidential Information in strict confidence;\n(b) Not disclose Confidential Information to any third party without prior written consent;\n(c) Use Confidential Information solely for the purpose of performing their employment duties;\n(d) Notify the Employer immediately upon becoming aware of any unauthorized disclosure.\n\n3. EXCEPTIONS\n\nThis Agreement does not apply to information that:\n(a) Is or becomes publicly available through no breach of this Agreement;\n(b) Was lawfully in the Employee''s possession prior to disclosure;\n(c) Is required to be disclosed by law or court order.\n\n4. RETURN OF INFORMATION\n\nUpon termination of employment, the Employee will promptly return all materials containing Confidential Information.\n\n5. DURATION\n\nThis Agreement remains in effect during employment and for {{nda_duration_years}} years following termination.\n\n─────────────────────────────────────────────────────────────\nSIGNATURES\n\nEmployee: _______________________________  Date: ___________\n{{employee_full_name}}\n\nEmployer: _______________________________  Date: ___________\n{{employer_signatory_name}}, {{employer_signatory_title}}',
  '{
    "ON": "This Agreement is governed by the laws of the Province of Ontario. The parties agree to the exclusive jurisdiction of the courts of Ontario for any disputes arising under this Agreement.",
    "BC": "This Agreement is governed by the laws of the Province of British Columbia. The parties agree to the exclusive jurisdiction of the courts of British Columbia for any disputes.",
    "AB": "This Agreement is governed by the laws of the Province of Alberta. The parties agree to the exclusive jurisdiction of the courts of Alberta for any disputes.",
    "QC": "La présente convention est régie par les lois de la Province de Québec. Les parties acceptent la compétence exclusive des tribunaux du Québec pour tout litige en découlant."
  }'::jsonb,
  '[
    {"key":"employer_name","label":"Employer Name","required":true},
    {"key":"employee_full_name","label":"Employee Full Name","required":true},
    {"key":"start_date","label":"Agreement Date","required":true},
    {"key":"nda_duration_years","label":"Post-Employment Duration (Years)","required":true},
    {"key":"employer_signatory_name","label":"Signatory Name","required":true},
    {"key":"employer_signatory_title","label":"Signatory Title","required":true}
  ]'::jsonb,
  true, true, '1.0'
),

-- ─── 4. PROBATION NOTICE ──────────────────────────────────────────────────────
(
  NULL,
  'probation_notice',
  'Probation Period Notice',
  'Formal notice confirming probation period terms and expectations. Given to the employee on or before their first day.',
  E'PROBATIONARY PERIOD NOTICE\n\nTo: {{employee_full_name}}\nPosition: {{position_title}}\nStart Date: {{start_date}}\nProbation End Date: {{probation_end_date}}\n\nDear {{employee_full_name}},\n\nThis letter confirms that your employment as {{position_title}} with {{employer_name}} is subject to a probationary period of {{probation_period}} commencing {{start_date}} and ending {{probation_end_date}}.\n\nDURING PROBATION\n\nDuring the probationary period, your performance, conduct, and suitability for the role will be assessed. You will receive regular feedback from your manager, {{reports_to_name}}.\n\nEither party may terminate employment during the probationary period with one week''s written notice.\n\nUPON SUCCESSFUL COMPLETION\n\nIf your probationary period is completed satisfactorily, you will become a regular employee as of {{probation_end_date}}, and your full statutory entitlements under applicable employment standards legislation will apply.\n\nACKNOWLEDGEMENT\n\nBy signing below, you confirm you have read and understood the terms of your probationary period.\n\nEmployee: _______________________________  Date: ___________\n{{employee_full_name}}\n\nHR / Manager: __________________________  Date: ___________\n{{employer_signatory_name}}',
  '{
    "ON": "This notice is provided in accordance with the Employment Standards Act, 2000 (Ontario). The probationary period does not exceed the statutory maximum of 3 months (90 days). During probation, termination of employment does not require notice under the ESA.",
    "BC": "This notice is provided in accordance with the Employment Standards Act (British Columbia). The probationary period does not exceed 3 months. During probation, the Employer may terminate without notice as permitted under the BC ESA.",
    "AB": "This notice is provided in accordance with the Employment Standards Code (Alberta). The probationary period does not exceed 3 months (90 days) as permitted under the Code.",
    "QC": "Cet avis est fourni conformément à la Loi sur les normes du travail (Québec). La période de probation est raisonnable et ne dépasse généralement pas 3 mois."
  }'::jsonb,
  '[
    {"key":"employer_name","label":"Employer Name","required":true},
    {"key":"employee_full_name","label":"Employee Full Name","required":true},
    {"key":"position_title","label":"Position Title","required":true},
    {"key":"start_date","label":"Start Date","required":true},
    {"key":"probation_period","label":"Probation Period Description","required":true},
    {"key":"probation_end_date","label":"Probation End Date","required":true},
    {"key":"reports_to_name","label":"Manager Name","required":false},
    {"key":"employer_signatory_name","label":"HR/Manager Signatory Name","required":true}
  ]'::jsonb,
  true, true, '1.0'
)

ON CONFLICT DO NOTHING;
