CREATE OR REPLACE FUNCTION public.get_signup_departments()
RETURNS TABLE(id uuid, name text, description text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.description
  FROM public.departments AS d
  ORDER BY d.name;
$$;

GRANT SELECT ON public.departments TO anon;

CREATE POLICY "Guests can view departments during signup"
ON public.departments
FOR SELECT
TO anon
USING (true);