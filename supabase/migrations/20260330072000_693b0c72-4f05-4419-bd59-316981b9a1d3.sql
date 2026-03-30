
-- FIX 1: Admin message INSERT - require sender_id = auth.uid()
DROP POLICY IF EXISTS "Admins can send messages to any group" ON public.messages;
CREATE POLICY "Admins can send messages to any group"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- FIX 2: Split chat_group_members ALL policy into specific operations
DROP POLICY IF EXISTS "Group admins can manage members" ON public.chat_group_members;

CREATE POLICY "Group admins can insert members"
ON public.chat_group_members FOR INSERT
TO authenticated
WITH CHECK (
  is_group_admin(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM chat_groups WHERE id = chat_group_members.group_id AND created_by = auth.uid())
);

CREATE POLICY "Group admins can update members"
ON public.chat_group_members FOR UPDATE
TO authenticated
USING (
  is_group_admin(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM chat_groups WHERE id = chat_group_members.group_id AND created_by = auth.uid())
);

CREATE POLICY "Group admins can delete members"
ON public.chat_group_members FOR DELETE
TO authenticated
USING (
  is_group_admin(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM chat_groups WHERE id = chat_group_members.group_id AND created_by = auth.uid())
);

-- FIX 3: Remove notifications from Realtime (same issue as profiles - sensitive data broadcast)
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;

-- FIX 4: Dismiss dept head sensitive data access - they're managers, this is intentional
-- (No SQL change needed, handled via security finding management)
