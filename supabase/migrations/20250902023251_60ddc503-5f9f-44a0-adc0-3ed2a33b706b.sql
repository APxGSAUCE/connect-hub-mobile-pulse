-- Fix RLS policies for profiles table to ensure proper access for approvals
-- Add missing index for better performance

-- Update RLS policy to allow admins to update approval status
DROP POLICY IF EXISTS "Admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create comprehensive admin policy for profiles
CREATE POLICY "Admins can manage profiles" 
ON public.profiles 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Allow department heads to view and manage their department profiles  
CREATE POLICY "Department heads can manage department profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid() 
    AND d.head_user_id = auth.uid()
    AND public.profiles.department_id = d.id
  )
);

-- Allow department heads to update approval status for their department
CREATE POLICY "Department heads can approve department profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid() 
    AND d.head_user_id = auth.uid()
    AND public.profiles.department_id = d.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid() 
    AND d.head_user_id = auth.uid()
    AND public.profiles.department_id = d.id
  )
);

-- Add index for better performance on approval queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);

-- Update the get_pending_approvals function to be more robust
CREATE OR REPLACE FUNCTION public.get_pending_approvals()
RETURNS TABLE(
  id uuid, 
  first_name text, 
  last_name text, 
  email text, 
  employee_id text, 
  phone text, 
  "position" text, 
  department_id uuid, 
  approval_status approval_status, 
  created_at timestamp with time zone, 
  approval_notes text, 
  rejected_reason text, 
  department_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has permission to view approvals
  IF NOT (
    EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    ) OR EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON p.department_id = d.id
      WHERE p.id = auth.uid() AND d.head_user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Insufficient permissions'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.employee_id,
    p.phone,
    p."position",
    p.department_id,
    p.approval_status,
    p.created_at,
    p.approval_notes,
    p.rejected_reason,
    COALESCE(d.name, 'No Department') as department_name
  FROM public.profiles p
  LEFT JOIN public.departments d ON p.department_id = d.id
  WHERE p.approval_status = 'pending'
  AND (
    -- Super admin and admin can see all pending approvals
    EXISTS(
      SELECT 1 FROM public.profiles admin_p
      WHERE admin_p.id = auth.uid() AND admin_p.role IN ('admin', 'super_admin')
    ) OR
    -- Department heads can see their department's pending approvals
    (p.department_id IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.departments dept
      WHERE dept.id = p.department_id AND dept.head_user_id = auth.uid()
    ))
  )
  ORDER BY p.created_at ASC;
END;
$function$;