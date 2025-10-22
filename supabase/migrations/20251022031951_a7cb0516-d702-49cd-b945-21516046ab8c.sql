-- Fix security warnings: Add search_path to existing functions

-- Fix log_role_change function
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.notifications (
      user_id,
      title, 
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      NEW.id,
      'Role Updated',
      'Your role has been changed from ' || COALESCE(OLD.role, 'none') || ' to ' || COALESCE(NEW.role, 'none'),
      'security',
      'role_change',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix notify_role_change function
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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