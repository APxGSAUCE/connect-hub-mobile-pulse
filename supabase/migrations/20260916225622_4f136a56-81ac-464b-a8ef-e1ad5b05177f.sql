CREATE TABLE public.access_request_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  outcome text NOT NULL DEFAULT 'success',
  notes text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_request_audit TO authenticated;
GRANT ALL ON public.access_request_audit TO service_role;

ALTER TABLE public.access_request_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access request audit"
ON public.access_request_audit FOR SELECT TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Reviewers can view access request audit"
ON public.access_request_audit FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.departments d WHERE d.head_user_id = auth.uid())
);

CREATE INDEX access_request_audit_profile_idx ON public.access_request_audit (profile_id, created_at DESC);

-- Log every submission attempt (success and failure).
CREATE OR REPLACE FUNCTION public.request_access_approval(request_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_status approval_status;
  clean_notes text := NULLIF(btrim(COALESCE(request_notes, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE LOG 'request_access_approval denied: unauthenticated caller';
    RAISE EXCEPTION 'Access denied: authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT approval_status INTO current_status
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_status = 'approved' THEN
    INSERT INTO public.access_request_audit (profile_id, actor_id, action, outcome, notes, error_message)
    VALUES (auth.uid(), auth.uid(), 'request_submitted', 'failed', clean_notes, 'Account already approved');
    RAISE LOG 'request_access_approval rejected for %: already approved', auth.uid();
    RAISE EXCEPTION 'Your account is already approved' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.self_access_request', 'on', true);

  UPDATE public.profiles
  SET approval_status = 'pending',
      approval_notes = clean_notes,
      rejected_reason = NULL,
      approved_by = NULL,
      approved_at = NULL,
      updated_at = now()
  WHERE id = auth.uid();

  PERFORM set_config('app.self_access_request', 'off', true);

  INSERT INTO public.access_request_audit (profile_id, actor_id, action, outcome, notes)
  VALUES (auth.uid(), auth.uid(), 'request_submitted', 'success', clean_notes);

  RAISE LOG 'request_access_approval succeeded for %', auth.uid();
END;
$function$;

-- Reviewer action: approve or reject an access request with an audit trail.
CREATE OR REPLACE FUNCTION public.review_access_request(
  _profile_id uuid,
  _approve boolean,
  _notes text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_notes text := NULLIF(btrim(COALESCE(_notes, '')), '');
  target_dept uuid;
  is_reviewer boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: authentication required' USING ERRCODE = '42501';
  END IF;

  IF _profile_id = auth.uid() THEN
    RAISE LOG 'review_access_request blocked self-review by %', auth.uid();
    RAISE EXCEPTION 'Access denied: you cannot review your own request' USING ERRCODE = '42501';
  END IF;

  SELECT department_id INTO target_dept FROM public.profiles WHERE id = _profile_id;

  is_reviewer := public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (target_dept IS NOT NULL AND public.is_department_head(target_dept));

  IF NOT is_reviewer THEN
    RAISE LOG 'review_access_request denied for reviewer %', auth.uid();
    RAISE EXCEPTION 'Access denied: reviewer privileges required' USING ERRCODE = '42501';
  END IF;

  IF NOT _approve AND clean_notes IS NULL THEN
    RAISE EXCEPTION 'A reason is required when rejecting a request';
  END IF;

  IF _approve THEN
    UPDATE public.profiles
    SET approval_status = 'approved',
        approved_by = auth.uid(),
        approved_at = now(),
        approval_notes = clean_notes,
        rejected_reason = NULL,
        updated_at = now()
    WHERE id = _profile_id;
  ELSE
    UPDATE public.profiles
    SET approval_status = 'rejected',
        rejected_reason = clean_notes,
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    WHERE id = _profile_id;
  END IF;

  INSERT INTO public.access_request_audit (profile_id, actor_id, action, outcome, notes)
  VALUES (
    _profile_id,
    auth.uid(),
    CASE WHEN _approve THEN 'request_approved' ELSE 'request_rejected' END,
    'success',
    clean_notes
  );

  RAISE LOG 'review_access_request: % by % for %',
    CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, auth.uid(), _profile_id;
END;
$function$;