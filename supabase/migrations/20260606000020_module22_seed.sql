-- Seed data for speak_up_categories
INSERT INTO speak_up_categories (id, name, description, display_order)
VALUES
  (gen_random_uuid(), 'Safety Hazard',        'An unsafe condition or near miss',     1),
  (gen_random_uuid(), 'Bullying or Harassment','Inappropriate workplace behaviour',    2),
  (gen_random_uuid(), 'Misconduct',            'Policy or procedure violation',        3),
  (gen_random_uuid(), 'Environmental Concern', 'Environmental impact or breach',       4),
  (gen_random_uuid(), 'Theft or Fraud',        'Financial misconduct',                 5),
  (gen_random_uuid(), 'Other',                 'Other concerns',                       6)
ON CONFLICT DO NOTHING;
