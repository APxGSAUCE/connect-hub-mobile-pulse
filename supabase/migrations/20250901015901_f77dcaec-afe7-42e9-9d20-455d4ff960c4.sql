-- First, let's see what roles are currently allowed and add super_admin if needed
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the constraint with super_admin included
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('employee', 'admin', 'super_admin'));

-- Now set your account as super admin
UPDATE public.profiles 
SET role = 'super_admin'
WHERE email = 'neilreynon030801@gmail.com';