CREATE TABLE public.role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_role public.app_role NOT NULL,
  desired_role public.app_role NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.role_change_requests TO authenticated;
GRANT ALL ON public.role_change_requests TO service_role;

ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role requests"
ON public.role_change_requests
FOR SELECT TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Super admins can view role requests"
ON public.role_change_requests
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE UNIQUE INDEX role_change_requests_one_pending_per_user
ON public.role_change_requests (requested_by)
WHERE status = 'pending'::public.approval_status;

CREATE OR REPLACE FUNCTION public.submit_role_change_request(_requested_role public.app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role public.app_role;
  request_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT public.get_user_role(auth.uid()) INTO requester_role;
  IF requester_role NOT IN ('admin'::public.app_role, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF _requested_role = requester_role THEN
    RAISE EXCEPTION 'Choose a different role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.role_change_requests
    WHERE requested_by = auth.uid()
      AND status = 'pending'::public.approval_status
  ) THEN
    RAISE EXCEPTION 'You already have a pending role change request';
  END IF;

  INSERT INTO public.role_change_requests (requested_by, previous_role, desired_role)
  VALUES (auth.uid(), requester_role, _requested_role)
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_role_change_request(
  _request_id uuid,
  _approve boolean,
  _review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.role_change_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Super Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO request_row
  FROM public.role_change_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND OR request_row.status <> 'pending'::public.approval_status THEN
    RAISE EXCEPTION 'Pending request not found';
  END IF;

  IF request_row.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'Another Super Admin must review your request' USING ERRCODE = '42501';
  END IF;

  IF _approve THEN
    DELETE FROM public.user_roles WHERE user_id = request_row.requested_by;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (request_row.requested_by, request_row.desired_role);

    UPDATE public.profiles
    SET role = request_row.desired_role::text,
        updated_at = now()
    WHERE id = request_row.requested_by;
  END IF;

  UPDATE public.role_change_requests
  SET status = CASE WHEN _approve THEN 'approved'::public.approval_status ELSE 'rejected'::public.approval_status END,
      review_notes = NULLIF(btrim(_review_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    request_row.requested_by,
    CASE WHEN _approve THEN 'Role change approved' ELSE 'Role change rejected' END,
    CASE WHEN _approve
      THEN 'Your role was changed to ' || replace(request_row.desired_role::text, '_', ' ') || '.'
      ELSE 'Your role change request was not approved.'
    END,
    'role_change',
    _request_id,
    'role_change_request'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_role_change_request(public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_role_change_request(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_role_change_request(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_role_change_request(uuid, boolean, text) TO authenticated;