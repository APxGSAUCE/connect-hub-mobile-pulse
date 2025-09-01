-- Fix ambiguous column references in get_employee_details_admin function
DROP FUNCTION IF EXISTS get_employee_details_admin();

CREATE OR REPLACE FUNCTION get_employee_details_admin()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  position text,
  status text,
  department_id uuid,
  employee_id text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.position,
    p.status,
    p.department_id,
    p.employee_id,
    p.avatar_url
  FROM profiles p
  WHERE p.status IS NOT NULL;
END;
$$;

-- Fix ambiguous column references in get_department_colleagues function  
DROP FUNCTION IF EXISTS get_department_colleagues();

CREATE OR REPLACE FUNCTION get_department_colleagues()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  position text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_dept_id uuid;
BEGIN
  -- Get current user's department
  SELECT p.department_id INTO user_dept_id
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Return basic public info for department colleagues
  IF user_dept_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.position,
      p.avatar_url
    FROM profiles p
    WHERE p.department_id = user_dept_id
    AND p.id != auth.uid()
    AND p.status = 'active';
  END IF;
END;
$$;