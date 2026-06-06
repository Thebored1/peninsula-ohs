-- 1. WHMIS 2015 Fundamentals
WITH c1 AS (
  INSERT INTO training_courses (organisation_id, name, code, course_type, description, duration_hours, validity_period_months, is_certification, is_active)
  VALUES (NULL, 'WHMIS 2015 Fundamentals', 'WHMIS-2015', 'e_learning', 'Canadian workplace hazardous materials information system. Covers GHS-aligned hazard classification, labels, and Safety Data Sheets. Required for all workers who may be exposed to hazardous products.', 2, 12, true, true)
  RETURNING id
)
INSERT INTO training_course_modules (course_id, organisation_id, module_number, title, description, content_type, duration_minutes, is_mandatory)
SELECT id, NULL, m.module_number, m.title, m.description, 'reading', m.duration_minutes, true
FROM c1, (VALUES
  (1, 'Hazard Classification', 'Overview of the 10 GHS physical hazard classes and 10 health hazard classes used in WHMIS 2015', 20),
  (2, 'Workplace Labels', 'Understanding product identifier, pictograms, signal word, hazard statements, precautionary statements, and supplier information', 20),
  (3, 'Safety Data Sheets (SDS)', 'The 16 sections of an SDS, how to locate and interpret safety information, and worker rights to access', 25),
  (4, 'Safe Handling Practices', 'PPE selection, safe storage, spill response, and disposal procedures for hazardous products', 15)
) AS m(module_number, title, description, duration_minutes);

-- 2. Harassment & Violence Prevention
WITH c2 AS (
  INSERT INTO training_courses (organisation_id, name, code, course_type, description, duration_hours, validity_period_months, is_certification, is_active)
  VALUES (NULL, 'Harassment & Violence Prevention', 'HVP-101', 'e_learning', 'Recognising, preventing, and responding to workplace harassment, discrimination, and violence. Covers rights, responsibilities, and reporting procedures under Canadian federal and provincial law.', 1, 24, true, true)
  RETURNING id
)
INSERT INTO training_course_modules (course_id, organisation_id, module_number, title, description, content_type, duration_minutes, is_mandatory)
SELECT id, NULL, m.module_number, m.title, m.description, 'reading', m.duration_minutes, true
FROM c2, (VALUES
  (1, 'Recognising Harassment and Violence', 'Definitions, types (sexual, personal, discriminatory), and examples of workplace harassment and violence', 20),
  (2, 'Rights and Responsibilities', 'Worker rights to a harassment-free workplace, employer obligations, supervisor responsibilities, and bystander duty to report', 20),
  (3, 'Reporting and Response Process', 'How to make a complaint, investigation process, confidentiality protections, and support resources available', 20)
) AS m(module_number, title, description, duration_minutes);

-- 3. Emergency Evacuation Procedures
WITH c3 AS (
  INSERT INTO training_courses (organisation_id, name, code, course_type, description, duration_hours, validity_period_months, is_certification, is_active)
  VALUES (NULL, 'Emergency Evacuation Procedures', 'EVAC-101', 'classroom', 'How to respond to workplace emergencies including fire, medical emergencies, and other crises. Covers evacuation routes, assembly points, warden roles, and emergency contacts.', 1, 12, true, true)
  RETURNING id
)
INSERT INTO training_course_modules (course_id, organisation_id, module_number, title, description, content_type, duration_minutes, is_mandatory)
SELECT id, NULL, m.module_number, m.title, m.description, 'reading', m.duration_minutes, true
FROM c3, (VALUES
  (1, 'Emergency Alarm and Signals', 'Types of alarms, what each signal means, and immediate actions to take upon hearing an alarm', 15),
  (2, 'Evacuation Routes and Assembly Points', 'Primary and secondary evacuation routes, designated assembly points, and muster procedures', 20),
  (3, 'Emergency Warden Roles', 'Floor warden responsibilities, roll call procedures, communication with emergency services, and re-entry authorization', 20)
) AS m(module_number, title, description, duration_minutes);

-- 4. Safe Manual Handling
WITH c4 AS (
  INSERT INTO training_courses (organisation_id, name, code, course_type, description, duration_hours, validity_period_months, is_certification, is_active)
  VALUES (NULL, 'Safe Manual Handling Techniques', 'MMH-101', 'on_the_job', 'Prevent musculoskeletal injuries through correct lifting, carrying, pushing, and pulling techniques. Includes risk assessment for manual tasks and use of mechanical aids.', 1, 36, false, true)
  RETURNING id
)
INSERT INTO training_course_modules (course_id, organisation_id, module_number, title, description, content_type, duration_minutes, is_mandatory)
SELECT id, NULL, m.module_number, m.title, m.description, 'reading', m.duration_minutes, true
FROM c4, (VALUES
  (1, 'Understanding Manual Handling Risks', 'What causes musculoskeletal disorders, high-risk factors (weight, posture, repetition, environment), and relevant legislation', 15),
  (2, 'Safe Lifting and Carrying Technique', 'Step-by-step safe lift sequence, weight limits, team lifting, and when to use mechanical aids', 20),
  (3, 'Mechanical Aids and Alternative Approaches', 'Types of mechanical aids (trolleys, pallet jacks, hoists), when to use them, and task redesign to eliminate manual handling', 15)
) AS m(module_number, title, description, duration_minutes);

-- 5. Working at Heights Awareness
WITH c5 AS (
  INSERT INTO training_courses (organisation_id, name, code, course_type, description, duration_hours, validity_period_months, is_certification, is_active)
  VALUES (NULL, 'Working at Heights Awareness', 'WAH-101', 'classroom', 'Awareness-level training for all workers on sites where work at heights occurs. Covers legislation, the hierarchy of fall prevention controls, and equipment identification.', 2, 12, true, true)
  RETURNING id
)
INSERT INTO training_course_modules (course_id, organisation_id, module_number, title, description, content_type, duration_minutes, is_mandatory)
SELECT id, NULL, m.module_number, m.title, m.description, 'reading', m.duration_minutes, true
FROM c5, (VALUES
  (1, 'Legislation and Duty of Care', 'Provincial WHS legislation requirements for work at heights, duty holder obligations, and penalties for non-compliance', 20),
  (2, 'Hierarchy of Fall Prevention Controls', 'Elimination, collective protection (scaffolding, EWPs, safety nets), personal fall arrest systems, and administrative controls in order of preference', 25),
  (3, 'Fall Protection Equipment', 'Types of harnesses, lanyards, anchor points, and self-retracting lifelines — selection, inspection, fitting, and storage', 25)
) AS m(module_number, title, description, duration_minutes);
