
-- Fix 1: Prevent self-escalation via profile UPDATE
-- Create a trigger that blocks users from updating sensitive columns on their own profile
CREATE OR REPLACE FUNCTION public.prevent_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow admins/super_admins to update any field
  IF has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Allow department heads to update profiles in their department
  IF OLD.department_id IS NOT NULL AND is_department_head(OLD.department_id) THEN
    RETURN NEW;
  END IF;

  -- For regular users updating their own profile, block sensitive columns
  IF auth.uid() = OLD.id THEN
    -- Prevent changing role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Cannot change your own role'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing approval_status
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      RAISE EXCEPTION 'Access denied: Cannot change your own approval status'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing approved_by
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'Access denied: Cannot change approval information'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing approved_at
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'Access denied: Cannot change approval information'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing employee_id
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'Access denied: Cannot change your own employee ID'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing approval_notes
    IF NEW.approval_notes IS DISTINCT FROM OLD.approval_notes THEN
      RAISE EXCEPTION 'Access denied: Cannot change approval notes'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing rejected_reason
    IF NEW.rejected_reason IS DISTINCT FROM OLD.rejected_reason THEN
      RAISE EXCEPTION 'Access denied: Cannot change rejection reason'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing verification_documents
    IF NEW.verification_documents IS DISTINCT FROM OLD.verification_documents THEN
      RAISE EXCEPTION 'Access denied: Cannot change verification documents'
        USING ERRCODE = '42501';
    END IF;
    -- Prevent changing status (active/inactive)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Access denied: Cannot change your own status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger BEFORE UPDATE on profiles
DROP TRIGGER IF EXISTS prevent_self_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_self_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_escalation();

-- Fix 2: Update can_delete_message to use user_roles instead of profiles.role
CREATE OR REPLACE FUNCTION public.can_delete_message(message_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_sender_id uuid;
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
  
  -- Admins and super_admins can delete any message (using user_roles, not profiles.role)
  IF has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Check if user is department head
  IF EXISTS(
    SELECT 1 FROM public.departments d
    WHERE d.head_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Fix 3: Update can_update_user_role to use user_roles instead of profiles.role
CREATE OR REPLACE FUNCTION public.can_update_user_role(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE
      WHEN has_role(auth.uid(), 'super_admin'::app_role) THEN true
      WHEN has_role(auth.uid(), 'admin'::app_role) AND new_role != 'super_admin' THEN true
      ELSE false
    END;
$$;
