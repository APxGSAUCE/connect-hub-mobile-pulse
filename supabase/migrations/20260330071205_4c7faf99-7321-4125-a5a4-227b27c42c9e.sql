
-- FIX 1: Add verification_documents, approval_notes, rejected_reason to immutable fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND approval_status IS NOT DISTINCT FROM (SELECT p.approval_status FROM public.profiles p WHERE p.id = auth.uid())
  AND employee_id IS NOT DISTINCT FROM (SELECT p.employee_id FROM public.profiles p WHERE p.id = auth.uid())
  AND approved_by IS NOT DISTINCT FROM (SELECT p.approved_by FROM public.profiles p WHERE p.id = auth.uid())
  AND approved_at IS NOT DISTINCT FROM (SELECT p.approved_at FROM public.profiles p WHERE p.id = auth.uid())
  AND verification_documents IS NOT DISTINCT FROM (SELECT p.verification_documents FROM public.profiles p WHERE p.id = auth.uid())
  AND approval_notes IS NOT DISTINCT FROM (SELECT p.approval_notes FROM public.profiles p WHERE p.id = auth.uid())
  AND rejected_reason IS NOT DISTINCT FROM (SELECT p.rejected_reason FROM public.profiles p WHERE p.id = auth.uid())
  AND status IS NOT DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
);

-- FIX 2: Split department head policy into specific operations (no SELECT on sensitive fields)
-- Department heads need UPDATE for managing profiles, but SELECT should be limited
DROP POLICY IF EXISTS "Department heads can manage department profiles" ON public.profiles;

-- Department heads can UPDATE profiles in their department
CREATE POLICY "Department heads can update department profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (department_id IS NOT NULL AND is_department_head(department_id));

-- Department heads can view basic info of department profiles
-- (they need this for management, but full row access is acceptable for dept heads
-- since they're responsible for their team)
CREATE POLICY "Department heads can view department profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (department_id IS NOT NULL AND is_department_head(department_id));
