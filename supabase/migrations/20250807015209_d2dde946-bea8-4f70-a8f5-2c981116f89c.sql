-- Clear existing departments
DELETE FROM public.departments;

-- Insert new Ilocos Sur Provincial Office departments
INSERT INTO public.departments (name, description) VALUES
-- Provincial Governor's Office and sub-departments
('Provincial Governor''s Office', 'Main office of the Provincial Governor'),
('Management Information Systems (MIS)', 'Under Provincial Governor''s Office - IT and information systems management'),
('Botika ti Probinsya ti Ilocos Sur (BPIS)', 'Under Provincial Governor''s Office - Provincial pharmacy services'),
('Sports', 'Under Provincial Governor''s Office - Sports development and management'),
('Provincial Education & Scholarship Affairs Division', 'Under Provincial Governor''s Office - Education and scholarship programs'),
('PYDO', 'Under Provincial Governor''s Office - Youth development office'),
('PESO', 'Under Provincial Governor''s Office - Public employment service office'),
('PDAO', 'Under Provincial Governor''s Office - Persons with disabilities affairs office'),
('BAC Secretariat', 'Under Provincial Governor''s Office - Bids and awards committee secretariat'),

-- Other Provincial Offices
('Provincial Administrator''s Office', 'Provincial administration and oversight'),
('Provincial Population Office', 'Population planning and development programs'),
('Provincial Human Resources Management Office', 'Human resource management and development'),
('Provincial Accounting Office', 'Financial accounting and reporting'),
('Provincial Assessors Office', 'Property assessment and valuation'),
('Provincial Agriculture Office', 'Agricultural development and extension services'),
('Provincial Budget Office', 'Budget planning and management'),
('Provincial Planning & Development Office', 'Provincial planning and development coordination'),
('Provincial Engineering Office', 'Infrastructure planning and engineering services'),
('Provincial Health Office', 'Public health services and programs'),
('Provincial Development and Promotion Office', 'Economic development and promotion'),
('PGIS Dive Center', 'Under Provincial Development and Promotion Office - Diving center operations'),
('Provincial Legal Office', 'Legal services and advisory'),
('Provincial Treasurer''s Office', 'Treasury and revenue collection'),
('Provincial Jail', 'Provincial detention and correctional facility'),
('Provincial Social Welfare & Development Office', 'Social welfare programs and services'),
('General Services Office', 'General administrative and support services'),
('Ilocos Sur Community College', 'Provincial community college education'),
('Sangguniang Panlalawigan', 'Provincial legislative body'),
('Provincial Library', 'Under Sangguniang Panlalawigan - Provincial library services'),
('Provincial Veterinary Office', 'Veterinary services and animal health programs'),
('PENRMO', 'Provincial Environment and Natural Resources Management Office'),
('PDDRMO', 'Provincial Disaster and Disaster Risk Management Office'),
('Provincial Internal Audit Office', 'Internal audit and compliance services'),
('PTV4, Vigan/Provincial Information Office', 'Provincial television and information services'),
('Bantay Baranggay', 'Barangay monitoring and support services');