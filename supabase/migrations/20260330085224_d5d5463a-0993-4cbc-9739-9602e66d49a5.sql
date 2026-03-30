
-- Fix 1: Add WITH CHECK to department head UPDATE policy to prevent privilege escalation
DROP POLICY IF EXISTS "Department heads can update department profiles" ON profiles;

CREATE POLICY "Department heads can update department profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  department_id IS NOT NULL AND is_department_head(department_id)
)
WITH CHECK (
  department_id IS NOT NULL AND is_department_head(department_id)
  AND (NOT (role IS DISTINCT FROM (SELECT p.role FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (approval_status IS DISTINCT FROM (SELECT p.approval_status FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (employee_id IS DISTINCT FROM (SELECT p.employee_id FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (approved_by IS DISTINCT FROM (SELECT p.approved_by FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (approved_at IS DISTINCT FROM (SELECT p.approved_at FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (verification_documents IS DISTINCT FROM (SELECT p.verification_documents FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (approval_notes IS DISTINCT FROM (SELECT p.approval_notes FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (rejected_reason IS DISTINCT FROM (SELECT p.rejected_reason FROM profiles p WHERE p.id = profiles.id)))
  AND (NOT (status IS DISTINCT FROM (SELECT p.status FROM profiles p WHERE p.id = profiles.id)))
);

-- Fix 2: Change message_read_receipts policies from public to authenticated
DROP POLICY IF EXISTS "Users can view read receipts for their groups" ON message_read_receipts;
DROP POLICY IF EXISTS "Users can create their own read receipts" ON message_read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON message_read_receipts;

CREATE POLICY "Users can view read receipts for their groups"
ON message_read_receipts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM messages m
    JOIN chat_group_members cgm ON m.group_id = cgm.group_id
    WHERE m.id = message_read_receipts.message_id AND cgm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own read receipts"
ON message_read_receipts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read receipts"
ON message_read_receipts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
