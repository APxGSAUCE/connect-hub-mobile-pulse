-- Fix the user role update issue by ensuring admin policies work properly
-- First, let's check if there are any conflicting policies or triggers

-- Check current RLS policies and improve them
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Department heads can manage department profiles" ON public.profiles;

-- Recreate policies with proper logic
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Regular users can only update non-role fields
    OLD.role = NEW.role OR is_user_admin()
  )
);

-- Admin policy for all operations
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL 
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- Department head policy 
CREATE POLICY "Department heads can manage department profiles" ON public.profiles
FOR ALL
USING (
  (department_id IS NOT NULL) 
  AND is_department_head(department_id)
  AND NOT is_user_admin() -- Don't interfere with admin policy
)
WITH CHECK (
  (department_id IS NOT NULL) 
  AND is_department_head(department_id)
  AND NOT is_user_admin() -- Don't interfere with admin policy
);

-- Make sure the role validation trigger is working properly
-- Remove and recreate to ensure it's working
DROP TRIGGER IF EXISTS validate_role_update_trigger ON public.profiles;
CREATE TRIGGER validate_role_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_update();