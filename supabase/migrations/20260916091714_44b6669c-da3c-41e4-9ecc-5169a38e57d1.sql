CREATE OR REPLACE FUNCTION public.prevent_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
BEGIN
  -- Apply self-edit protections before administrative bypasses.
  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Submit a role change request for review'
        USING ERRCODE = '42501';
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

    -- Department changes affect department-scoped access. Only administrators
    -- may update their own department from the secured admin settings page.
    IF NEW.department_id IS DISTINCT FROM OLD.department_id AND NOT caller_is_admin THEN
      RAISE EXCEPTION 'Access denied: An administrator must change your department'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  -- Administrators can manage other users.
  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  -- Department heads can manage profiles in their own department.
  IF OLD.department_id IS NOT NULL AND public.is_department_head(OLD.department_id) THEN
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_self_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_self_escalation() TO service_role;