-- Update the check constraint to include all role options
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['employee'::text, 'dept_head'::text, 'admin'::text, 'super_admin'::text]));