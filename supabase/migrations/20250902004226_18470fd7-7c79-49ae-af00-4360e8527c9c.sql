-- Update departments RLS policy to allow unauthenticated users to view departments for signup
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

-- Create new policy that allows both authenticated and unauthenticated users to view departments
CREATE POLICY "Users can view departments for signup and general access" 
ON public.departments 
FOR SELECT 
TO public
USING (true);