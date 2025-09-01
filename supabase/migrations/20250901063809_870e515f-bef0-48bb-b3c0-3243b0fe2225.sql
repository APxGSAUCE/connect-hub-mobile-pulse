-- Clean up all existing triggers and implement security fixes properly

-- Drop all existing triggers
DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;
DROP TRIGGER IF EXISTS profile_role_validation ON public.profiles;