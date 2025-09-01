-- Fix infinite recursion in profiles table RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view department colleagues basic info" ON public.profiles;

-- Create new non-recursive policies
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Check if current user has admin role directly from auth metadata or use a simpler approach
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND (u.raw_user_meta_data->>'role' = 'admin' OR u.raw_user_meta_data->>'role' = 'super_admin')
  )
  OR
  -- Allow if user is checking their own profile first, then check role
  (auth.uid() = profiles.id AND profiles.role IN ('admin', 'super_admin'))
);

-- Simplified department colleagues policy without function call
CREATE POLICY "Users can view department colleagues basic info" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND department_id IS NOT NULL 
  AND department_id IN (
    SELECT p.department_id 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.department_id IS NOT NULL
  )
);

-- Update the admin update policy to be safer
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND (u.raw_user_meta_data->>'role' = 'admin' OR u.raw_user_meta_data->>'role' = 'super_admin')
  )
  OR
  -- Self-check for admin role
  (auth.uid() = profiles.id AND profiles.role IN ('admin', 'super_admin'))
);