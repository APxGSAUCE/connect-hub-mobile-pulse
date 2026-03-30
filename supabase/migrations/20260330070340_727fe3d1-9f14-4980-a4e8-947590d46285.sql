
-- FIX: Replace all policies that check profiles.role with has_role() from user_roles table

-- 1. Fix "Users can create chat groups" on chat_groups
DROP POLICY IF EXISTS "Users can create chat groups" ON public.chat_groups;
CREATE POLICY "Users can create chat groups"
ON public.chat_groups FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.head_user_id = auth.uid()
    )
  )
);

-- 2. Fix "Users can view participants for accessible events" on event_participants
DROP POLICY IF EXISTS "Users can view participants for accessible events" ON public.event_participants;
CREATE POLICY "Users can view participants for accessible events"
ON public.event_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_participants.event_id AND e.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = event_participants.event_id AND ep.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- 3. Fix "Users can send messages to their groups" on messages
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.messages;
CREATE POLICY "Users can send messages to their groups"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chat_group_members cgm
    WHERE cgm.group_id = messages.group_id AND cgm.user_id = auth.uid()
  )
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.head_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_groups cg
      WHERE cg.id = messages.group_id AND cg.group_type = 'direct'
    )
  )
);
