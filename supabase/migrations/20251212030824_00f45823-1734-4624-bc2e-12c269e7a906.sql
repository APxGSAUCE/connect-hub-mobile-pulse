-- Fix 1: Remove public access to departments table
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;

-- Create authenticated-only policy for departments
CREATE POLICY "Authenticated users can view departments" ON departments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix 2: Remove the overly permissive notifications insert policy
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Create secure policy that only allows authenticated users to receive notifications
-- and only system/admin triggered inserts (via triggers or service role)
CREATE POLICY "Authenticated users can receive notifications" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also allow service_role to insert any notifications (for system-generated ones)
CREATE POLICY "Service role can create any notifications" ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);