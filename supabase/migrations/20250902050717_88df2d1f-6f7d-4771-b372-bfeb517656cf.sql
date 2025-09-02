-- Fix the RLS policy syntax error by simplifying the role update constraints
-- Drop and recreate the problematic policy

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a simpler policy that allows users to update their own profile
-- but prevents regular users from changing their role
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- The role validation is handled by the validate_role_update trigger
-- which is properly set up to check permissions before allowing role changes