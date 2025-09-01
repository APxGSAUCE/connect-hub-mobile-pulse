-- Implement security triggers for role validation and audit logging

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