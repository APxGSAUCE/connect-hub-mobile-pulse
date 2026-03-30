
-- FIX 1: Restrict can_delete_message so dept heads can only delete in groups they're members of
CREATE OR REPLACE FUNCTION public.can_delete_message(message_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  message_sender_id uuid;
  message_group_id uuid;
BEGIN
  SELECT sender_id, group_id INTO message_sender_id, message_group_id
  FROM public.messages WHERE id = message_id_param;

  IF message_sender_id = auth.uid() THEN RETURN true; END IF;

  IF has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Department heads can only delete messages in groups they are members of
  IF EXISTS(
    SELECT 1 FROM public.departments d WHERE d.head_user_id = auth.uid()
  ) AND EXISTS(
    SELECT 1 FROM public.chat_group_members cgm
    WHERE cgm.group_id = message_group_id AND cgm.user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- FIX 2: Change all remaining public-role policies to authenticated
-- chat_groups
DROP POLICY IF EXISTS "Group admins can update groups" ON public.chat_groups;
CREATE POLICY "Group admins can update groups" ON public.chat_groups FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR is_group_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.chat_groups;
CREATE POLICY "Users can view groups they are members of" ON public.chat_groups FOR SELECT TO authenticated
USING (created_by = auth.uid() OR is_group_member(id, auth.uid()));

-- chat_group_members
DROP POLICY IF EXISTS "Group admins can manage members" ON public.chat_group_members;
CREATE POLICY "Group admins can manage members" ON public.chat_group_members FOR ALL TO authenticated
USING (is_group_admin(group_id, auth.uid()) OR EXISTS (
  SELECT 1 FROM chat_groups WHERE id = chat_group_members.group_id AND created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.chat_group_members;
CREATE POLICY "Users can view group members for their groups" ON public.chat_group_members FOR SELECT TO authenticated
USING (is_group_member(group_id, auth.uid()));

-- messages
DROP POLICY IF EXISTS "Users can delete messages they have permission for" ON public.messages;
CREATE POLICY "Users can delete messages they have permission for" ON public.messages FOR DELETE TO authenticated
USING (can_delete_message(id));

-- events
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE TO authenticated
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view accessible events" ON public.events;
CREATE POLICY "Users can view accessible events" ON public.events FOR SELECT TO authenticated
USING (can_user_access_event(id));

DROP POLICY IF EXISTS "Authorized users can create events" ON public.events;
CREATE POLICY "Authorized users can create events" ON public.events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND can_user_create_content());
