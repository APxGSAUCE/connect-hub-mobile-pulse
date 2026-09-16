CREATE OR REPLACE FUNCTION public.get_signup_departments()
RETURNS TABLE(id uuid, name text, description text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.description
  FROM public.departments AS d
  ORDER BY d.name;
$$;

REVOKE ALL ON FUNCTION public.get_signup_departments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_departments() TO anon, authenticated, service_role;