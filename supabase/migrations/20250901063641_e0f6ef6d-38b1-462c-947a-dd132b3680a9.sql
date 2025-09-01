-- Add missing security policies and audit logging

-- Create trigger for role change audit logging (if not exists)
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes for security audit
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role changes (drop first if exists)
DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;
CREATE TRIGGER profile_role_change_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Add function to validate role updates (prevent self-escalation)
CREATE OR REPLACE FUNCTION public.can_update_user_role(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
    AND (
      -- Super admin can change anyone's role
      p.role = 'super_admin'
      OR
      -- Admin can change roles but not to super_admin
      (p.role = 'admin' AND new_role != 'super_admin')
    )
  );
$function$