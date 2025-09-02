-- Create approval status enum for better user management
DO $$ BEGIN
    CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add approval tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Update existing users to be approved
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Create function to handle message deletion by admins/dept heads
CREATE OR REPLACE FUNCTION public.can_delete_message(message_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_sender_id uuid;
  current_user_role text;
  is_dept_head boolean;
  message_group_id uuid;
BEGIN
  -- Get message details
  SELECT sender_id, group_id INTO message_sender_id, message_group_id
  FROM public.messages 
  WHERE id = message_id_param;
  
  -- If user is the sender, they can delete their own message
  IF message_sender_id = auth.uid() THEN
    RETURN true;
  END IF;
  
  -- Get current user role
  SELECT role INTO current_user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Admins and super_admins can delete any message
  IF current_user_role IN ('admin', 'super_admin') THEN
    RETURN true;
  END IF;
  
  -- Check if user is department head
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid() AND d.head_user_id = auth.uid()
  ) INTO is_dept_head;
  
  IF is_dept_head THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function for real-time role change notifications
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notification for role changes
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
          CASE NEW.approval_status
            WHEN 'approved' THEN 'Account Approved'
            WHEN 'rejected' THEN 'Account Rejected'
            ELSE 'Account Status Changed'
          END
        ELSE 'Role Updated'
      END,
      CASE 
        WHEN OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
          CASE NEW.approval_status
            WHEN 'approved' THEN 'Your account has been approved and you now have access to the system.'
            WHEN 'rejected' THEN 'Your account has been rejected. Reason: ' || COALESCE(NEW.rejected_reason, 'No reason provided.')
            ELSE 'Your account status has been updated.'
          END
        ELSE 'Your role has been changed from ' || COALESCE(OLD.role, 'none') || ' to ' || COALESCE(NEW.role, 'none')
      END,
      CASE 
        WHEN OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN 'approval'
        ELSE 'role_change'
      END,
      'profile_update',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role change notifications
DROP TRIGGER IF EXISTS trigger_notify_role_change ON public.profiles;
CREATE TRIGGER trigger_notify_role_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_role_change();

-- Create RLS policy for message deletion
DROP POLICY IF EXISTS "Users can delete messages they have permission for" ON public.messages;
CREATE POLICY "Users can delete messages they have permission for"
ON public.messages
FOR DELETE
USING (can_delete_message(id));

-- Create function to get pending approvals for admins/dept heads
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
  approval_status public.approval_status,
  created_at timestamptz,
  approval_notes text,
  rejected_reason text,
  department_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has permission to view approvals
  IF NOT (is_user_admin() OR EXISTS(
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid() AND d.head_user_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'Access denied: Insufficient permissions';
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
    d.name as department_name
  FROM public.profiles p
  LEFT JOIN public.departments d ON p.department_id = d.id
  WHERE p.approval_status = 'pending'
  AND (
    is_user_admin() OR 
    (p.department_id IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.departments dept
      WHERE dept.id = p.department_id AND dept.head_user_id = auth.uid()
    ))
  )
  ORDER BY p.created_at ASC;
END;
$$;