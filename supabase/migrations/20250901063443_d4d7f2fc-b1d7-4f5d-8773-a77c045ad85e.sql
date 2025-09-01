-- Fix function search path security issue and add role escalation prevention

-- Drop and recreate the audit function with proper search path
DROP FUNCTION IF EXISTS public.log_role_change();

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Create function to validate role updates to prevent escalation
CREATE OR REPLACE FUNCTION public.validate_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if the user making the change is an admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Access denied: Only admins can change user roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role validation (runs before update)
DROP TRIGGER IF EXISTS profile_role_validation ON public.profiles;
CREATE TRIGGER profile_role_validation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_update();

-- Recreate the audit trigger with the corrected function
DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;
CREATE TRIGGER profile_role_change_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.log_role_change();