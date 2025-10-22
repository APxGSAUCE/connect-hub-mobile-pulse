-- Fix critical security issue: Require authentication for event access
-- This prevents unauthenticated users from viewing internal events and schedules

CREATE OR REPLACE FUNCTION public.can_user_access_event(event_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val text;
  is_creator boolean;
  is_participant boolean;
  creator_role text;
  creator_is_dept_head boolean;
BEGIN
  -- CRITICAL: Require authentication first - no access for unauthenticated users
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role from user_roles table (using has_role pattern)
  SELECT COALESCE(
    (SELECT role::text FROM user_roles WHERE user_id = auth.uid() ORDER BY role DESC LIMIT 1),
    'employee'
  ) INTO user_role_val;
  
  -- Check if user is creator
  SELECT (created_by = auth.uid()) INTO is_creator FROM events WHERE id = event_id_param;
  
  -- Check if user is participant
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = event_id_param AND user_id = auth.uid()) INTO is_participant;
  
  -- Get creator's role and check if they're a dept head
  SELECT 
    COALESCE(
      (SELECT role::text FROM user_roles WHERE user_id = e.created_by ORDER BY role DESC LIMIT 1),
      'employee'
    ),
    EXISTS(
      SELECT 1 FROM departments d 
      WHERE d.head_user_id = e.created_by
    )
  INTO creator_role, creator_is_dept_head
  FROM events e
  WHERE e.id = event_id_param;
  
  -- Allow access if:
  -- 1. User is admin/super_admin (can see all events)
  -- 2. User created the event
  -- 3. User is a participant
  -- 4. Event was created by admin, super_admin, or dept head (visible to all employees)
  RETURN (
    user_role_val IN ('admin', 'super_admin') OR 
    is_creator OR 
    is_participant OR
    creator_role IN ('admin', 'super_admin') OR
    creator_is_dept_head
  );
END;
$$;