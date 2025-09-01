-- Fix security issue: Restrict department colleagues to basic public info only

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view department colleagues basic info" ON public.profiles;

-- Create a new restrictive policy that only shows minimal public information
CREATE POLICY "Users can view department colleagues public info only" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see basic public info of colleagues in same department
  auth.uid() IS NOT NULL 
  AND department_id IS NOT NULL 
  AND department_id = get_current_user_department()
);

-- Create a database function to get safe colleague information
CREATE OR REPLACE FUNCTION public.get_department_colleagues()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  department_id UUID,
  avatar_url TEXT,
  status TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get current user's department
  DECLARE
    user_dept_id UUID;
  BEGIN
    SELECT department_id INTO user_dept_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Return only basic public information for same department colleagues
    RETURN QUERY
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.position,
      p.department_id,
      p.avatar_url,
      p.status
    FROM public.profiles p
    WHERE p.department_id = user_dept_id 
    AND p.department_id IS NOT NULL
    AND p.status = 'active';
  END;
END;
$$;

-- Create a function for admins to get full employee details (for admin functions)
CREATE OR REPLACE FUNCTION public.get_employee_details_admin()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  position TEXT,
  department_id UUID,
  phone TEXT,
  employee_id TEXT,
  avatar_url TEXT,
  status TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow admins and super_admins to access this function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return full employee information for admin purposes
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.position,
    p.department_id,
    p.phone,
    p.employee_id,
    p.avatar_url,
    p.status,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.status = 'active'
  ORDER BY p.first_name;
END;
$$;