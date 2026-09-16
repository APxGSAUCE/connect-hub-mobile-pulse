-- 1. Only validate role changes when the role actually changes (profiles table).
CREATE OR REPLACE FUNCTION public.validate_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE'
     AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can change user roles'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Allow the vetted self-service access request to set approval_status back to pending.
CREATE OR REPLACE FUNCTION public.prevent_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
  self_request boolean := coalesce(current_setting('app.self_access_request', true), '') = 'on';
BEGIN
  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Submit a role change request for review'
        USING ERRCODE = '42501';
    END IF;

    -- request_access_approval() may only move the account back to pending review.
    IF self_request THEN
      IF NEW.approval_status <> 'pending'::public.approval_status
        OR NEW.approved_by IS NOT NULL
        OR NEW.approved_at IS NOT NULL
        OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
        OR NEW.rejected_reason IS NOT NULL
        OR NEW.verification_documents IS DISTINCT FROM OLD.verification_documents
        OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.department_id IS DISTINCT FROM OLD.department_id THEN
        RAISE EXCEPTION 'Access denied: Cannot change protected account fields'
          USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.approval_notes IS DISTINCT FROM OLD.approval_notes
      OR NEW.rejected_reason IS DISTINCT FROM OLD.rejected_reason
      OR NEW.verification_documents IS DISTINCT FROM OLD.verification_documents
      OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Access denied: Cannot change protected account fields'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.department_id IS DISTINCT FROM OLD.department_id AND NOT caller_is_admin THEN
      RAISE EXCEPTION 'Access denied: An administrator must change your department'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  IF OLD.department_id IS NOT NULL AND public.is_department_head(OLD.department_id) THEN
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Mark the request as a vetted self-service action.
CREATE OR REPLACE FUNCTION public.request_access_approval(request_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  PERFORM set_config('app.self_access_request', 'on', true);

  UPDATE public.profiles
  SET approval_status = 'pending',
      approval_notes = NULLIF(btrim(COALESCE(request_notes, '')), ''),
      rejected_reason = NULL,
      approved_by = NULL,
      approved_at = NULL,
      updated_at = now()
  WHERE id = auth.uid();

  PERFORM set_config('app.self_access_request', 'off', true);
END;
$function$;