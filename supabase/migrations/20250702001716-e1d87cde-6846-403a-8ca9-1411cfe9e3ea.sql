-- Insert sample departments for testing
INSERT INTO public.departments (name, description) VALUES 
('Information Technology', 'IT support, software development, and system administration'),
('Human Resources', 'Employee management, recruitment, and organizational development'),
('Finance', 'Financial planning, accounting, and budget management'),
('Operations', 'Daily operations, logistics, and process management'),
('Marketing', 'Marketing campaigns, brand management, and customer outreach')
ON CONFLICT (name) DO NOTHING;