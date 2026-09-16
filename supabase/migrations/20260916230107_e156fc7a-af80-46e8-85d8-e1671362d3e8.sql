CREATE OR REPLACE FUNCTION public.validate_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ordinary profile edits that do not touch the role are allowed.
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE'
     AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Signup provisioning: the auth trigger creates the default employee role
  -- before any session exists. Allow only that exact case.
  IF TG_TABLE_NAME = 'user_roles' AND TG_OP = 'INSERT'
     AND auth.uid() IS NULL
     AND NEW.role = 'employee'::app_role THEN
    RETURN NEW;
  END IF;

  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can change user roles'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;