-- Fix function dependencies and implement role escalation prevention

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;
DROP FUNCTION IF EXISTS public.log_role_change() CASCADE;

-- Create new audit function with proper search path
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
CREATE TRIGGER profile_role_validation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_update();

-- Create trigger for role change audit (runs after update)
CREATE TRIGGER profile_role_change_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.log_role_change();