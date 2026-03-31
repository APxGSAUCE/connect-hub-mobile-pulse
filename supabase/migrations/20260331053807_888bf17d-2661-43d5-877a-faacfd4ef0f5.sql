
-- Fix 1: Remove the conflicting weaker INSERT policy on chat_groups
-- The "Admins can create groups" policy has an OR created_by = auth.uid() clause
-- that allows ANY authenticated user to create groups, bypassing role checks.
DROP POLICY IF EXISTS "Admins can create groups" ON chat_groups;

-- The "Users can create chat groups" policy already properly restricts creation
-- to admins, super_admins, and department heads. No replacement needed.
