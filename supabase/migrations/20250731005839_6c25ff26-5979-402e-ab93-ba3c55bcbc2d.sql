-- Fix function search_path security warnings
ALTER FUNCTION public.is_group_admin(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_group_member(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.create_direct_message_group(uuid) SET search_path = '';
ALTER FUNCTION public.get_dashboard_stats(uuid) SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- Fix departments RLS policy to allow system/admin creation
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON public.departments;

-- Create new policies for departments table
CREATE POLICY "Anyone can view departments" 
ON public.departments 
FOR SELECT 
USING (true);

CREATE POLICY "System can create departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Insert default departments if none exist
INSERT INTO public.departments (name, description) 
SELECT * FROM (
  VALUES 
    ('Human Resources', 'HR Department'),
    ('Information Technology', 'IT Department'), 
    ('Finance', 'Finance Department'),
    ('Operations', 'Operations Department'),
    ('Marketing', 'Marketing Department'),
    ('General Administration', 'General Admin')
) AS t(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.departments LIMIT 1);