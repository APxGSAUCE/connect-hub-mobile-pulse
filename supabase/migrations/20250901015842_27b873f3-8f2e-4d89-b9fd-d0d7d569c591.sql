-- Set neilreynon030801@gmail.com as super admin
UPDATE public.profiles 
SET role = 'super_admin'
WHERE email = 'neilreynon030801@gmail.com';

-- If the profile doesn't exist yet, we can insert it (this will only work if the user has signed up)
-- The trigger should have created the profile, but just in case:
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users 
WHERE email = 'neilreynon030801@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'neilreynon030801@gmail.com');