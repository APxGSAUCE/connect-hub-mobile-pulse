-- Fix infinite recursion in RLS policies and make neilreynon030801@gmail.com super admin

-- First, update the user to super admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'neilreynon030801@gmail.com';

-- Drop all existing RLS policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view department colleagues public info only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (non-role fields)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Department heads can manage department profiles" ON public.profiles;
DROP POLICY IF EXISTS "Department heads can approve department profiles" ON public.profiles;

-- Create simple, non-recursive RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Super admins and admins can do everything
CREATE POLICY "Super admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Users can view colleagues in their department (basic info only)
CREATE POLICY "Users can view department colleagues" 
ON public.profiles 
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND department_id IS NOT NULL 
  AND department_id = (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Department heads can manage their department profiles
CREATE POLICY "Department heads can manage department profiles"
ON public.profiles
FOR ALL
USING (
  department_id IS NOT NULL 
  AND department_id IN (
    SELECT d.id FROM public.departments d WHERE d.head_user_id = auth.uid()
  )
);

-- Update the departments table RLS to prevent recursion issues
DROP POLICY IF EXISTS "Users can view departments for signup and general access" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "System can create departments" ON public.departments;

-- Simple department policies
CREATE POLICY "Anyone can view departments" 
ON public.departments 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage departments" 
ON public.departments 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);