
-- FIX: Change profiles RLS policies from 'public' to 'authenticated' role
-- This prevents any unauthenticated access to sensitive profile data

-- Drop and recreate "Users can view their own profile" for authenticated only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Drop and recreate "Users can view department colleagues" for authenticated only
DROP POLICY IF EXISTS "Users can view department colleagues" ON public.profiles;
CREATE POLICY "Users can view department colleagues"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND department_id IS NOT NULL
  AND department_id = get_current_user_department()
);

-- Drop and recreate "Users can insert their own profile" for authenticated only
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Drop and recreate "Users can update their own profile" for authenticated only
-- Also add WITH CHECK to prevent updating sensitive fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Block role escalation: role must not change
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  -- Block approval_status changes
  AND approval_status IS NOT DISTINCT FROM (SELECT p.approval_status FROM public.profiles p WHERE p.id = auth.uid())
  -- Block employee_id changes
  AND employee_id IS NOT DISTINCT FROM (SELECT p.employee_id FROM public.profiles p WHERE p.id = auth.uid())
  -- Block approved_by changes
  AND approved_by IS NOT DISTINCT FROM (SELECT p.approved_by FROM public.profiles p WHERE p.id = auth.uid())
  -- Block approved_at changes
  AND approved_at IS NOT DISTINCT FROM (SELECT p.approved_at FROM public.profiles p WHERE p.id = auth.uid())
);

-- Drop and recreate "Admins can manage all profiles" for authenticated only
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (is_user_admin());

-- Drop and recreate "Department heads can manage department profiles" for authenticated only
DROP POLICY IF EXISTS "Department heads can manage department profiles" ON public.profiles;
CREATE POLICY "Department heads can manage department profiles"
ON public.profiles FOR ALL
TO authenticated
USING (department_id IS NOT NULL AND is_department_head(department_id));
