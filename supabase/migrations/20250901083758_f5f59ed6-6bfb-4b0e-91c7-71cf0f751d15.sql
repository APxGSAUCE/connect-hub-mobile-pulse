-- Fix position keyword issue and infinite recursion
-- First fix the database functions with proper column escaping
DROP FUNCTION IF EXISTS get_employee_details_admin();
DROP FUNCTION IF EXISTS get_department_colleagues();

-- Fix the functions with proper column escaping
CREATE OR REPLACE FUNCTION get_employee_details_admin()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  "position" text,
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
    p."position",
    p.status,
    p.department_id,
    p.employee_id,
    p.avatar_url
  FROM profiles p
  WHERE p.status IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION get_department_colleagues()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  "position" text,
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
      p."position",
      p.avatar_url
    FROM profiles p
    WHERE p.department_id = user_dept_id
    AND p.id != auth.uid()
    AND p.status = 'active';
  END IF;
END;
$$;

-- Fix infinite recursion in events table by dropping problematic policies
DROP POLICY IF EXISTS "Users can view events they participate in or created" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Create helper function to check if user can access events
CREATE OR REPLACE FUNCTION can_user_access_event(event_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_val text;
  is_creator boolean;
  is_participant boolean;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val FROM profiles WHERE id = auth.uid();
  
  -- Check if user is creator
  SELECT (created_by = auth.uid()) INTO is_creator FROM events WHERE id = event_id_param;
  
  -- Check if user is participant
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = event_id_param AND user_id = auth.uid()) INTO is_participant;
  
  RETURN (user_role_val IN ('admin', 'super_admin') OR is_creator OR is_participant);
END;
$$;

-- Recreate events policies without recursion
CREATE POLICY "Users can view accessible events" 
ON events FOR SELECT 
USING (can_user_access_event(id));

CREATE POLICY "Authorized users can create events" 
ON events FOR INSERT 
WITH CHECK (auth.uid() = created_by AND can_user_create_content());

CREATE POLICY "Users can update their own events" 
ON events FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" 
ON events FOR DELETE 
USING (auth.uid() = created_by);