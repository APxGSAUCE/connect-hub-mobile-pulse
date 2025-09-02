-- Fix event visibility so employees can see events created by admins and dept heads
CREATE OR REPLACE FUNCTION public.can_user_access_event(event_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val text;
  is_creator boolean;
  is_participant boolean;
  creator_role text;
  creator_is_dept_head boolean;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val FROM profiles WHERE id = auth.uid();
  
  -- Check if user is creator
  SELECT (created_by = auth.uid()) INTO is_creator FROM events WHERE id = event_id_param;
  
  -- Check if user is participant
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = event_id_param AND user_id = auth.uid()) INTO is_participant;
  
  -- Get creator's role and check if they're a dept head
  SELECT 
    p.role,
    EXISTS(
      SELECT 1 FROM departments d 
      WHERE d.head_user_id = e.created_by
    )
  INTO creator_role, creator_is_dept_head
  FROM events e
  JOIN profiles p ON e.created_by = p.id
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