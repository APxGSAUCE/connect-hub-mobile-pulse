-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.can_update_user_role(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
    AND (
      -- Super admin can change anyone's role
      p.role = 'super_admin'
      OR
      -- Admin can change roles but not to super_admin
      (p.role = 'admin' AND new_role != 'super_admin')
    )
  );
$function$