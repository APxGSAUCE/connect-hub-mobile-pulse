-- Fix critical security issue: Remove public access to departments table
-- This was exposing government organizational structure to unauthenticated users

-- Drop the overly permissive policy that allows anyone to view departments
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

-- Create a more secure policy that only allows authenticated users to view departments
CREATE POLICY "Authenticated users can view departments" 
ON public.departments 
FOR SELECT 
TO authenticated 
USING (true);

-- Ensure the existing admin policy remains for management operations
-- (This should already exist but ensuring it's properly defined)
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- System can create departments during setup (INSERT policy needs WITH CHECK)
DROP POLICY IF EXISTS "System can create departments" ON public.departments;

CREATE POLICY "System can create departments" 
ON public.departments 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);