CREATE OR REPLACE FUNCTION public.request_access_approval(request_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status approval_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT approval_status INTO current_status
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_status = 'approved' THEN
    RAISE EXCEPTION 'Your account is already approved' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET approval_status = 'pending',
      approval_notes = NULLIF(btrim(COALESCE(request_notes, '')), ''),
      rejected_reason = NULL,
      approved_by = NULL,
      approved_at = NULL,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_access_approval(text) TO authenticated;