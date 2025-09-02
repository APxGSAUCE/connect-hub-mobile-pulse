-- Fix infinite recursion by using security definer functions

-- Drop all existing RLS policies on profiles and departments
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view department colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Department heads can manage department profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Super admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

-- Create security definer functions to prevent recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_department()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_department_head(dept_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.departments 
    WHERE id = dept_id 
    AND head_user_id = auth.uid()
  );
$$;

-- Create simple RLS policies using the security definer functions
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

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (public.is_user_admin());

-- Users can view colleagues in their department
CREATE POLICY "Users can view department colleagues" 
ON public.profiles 
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND department_id IS NOT NULL 
  AND department_id = public.get_current_user_department()
);

-- Department heads can manage their department profiles
CREATE POLICY "Department heads can manage department profiles"
ON public.profiles
FOR ALL
USING (
  department_id IS NOT NULL 
  AND public.is_department_head(department_id)
);

-- Simple department policies
CREATE POLICY "Anyone can view departments" 
ON public.departments 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL
USING (public.is_user_admin());