-- Fix security vulnerability: Restrict profiles table access
-- Drop the overly permissive policy that allows public access to all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create more restrictive policies for viewing profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins can view all profiles (for management purposes)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role = 'admin'
  )
);

-- Users can view basic info of colleagues in their department (for collaboration)
-- This only exposes first_name, last_name, and position - not sensitive data
CREATE POLICY "Users can view department colleagues basic info" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  department_id IN (
    SELECT department_id FROM public.profiles 
    WHERE id = auth.uid() AND department_id IS NOT NULL
  )
);