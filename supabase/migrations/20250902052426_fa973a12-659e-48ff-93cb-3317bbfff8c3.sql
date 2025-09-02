-- Fix infinite recursion in messages RLS policy
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.messages;

CREATE POLICY "Users can send messages to their groups" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.chat_group_members cgm
    WHERE cgm.group_id = messages.group_id 
    AND cgm.user_id = auth.uid()
  )
  AND (
    -- Allow if user has content creation permissions
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    ) 
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON p.department_id = d.id
      WHERE p.id = auth.uid() 
      AND d.head_user_id = auth.uid()
    )
    -- Or if it's a direct message group (always allow)
    OR EXISTS (
      SELECT 1 FROM public.chat_groups cg
      WHERE cg.id = messages.group_id 
      AND cg.group_type = 'direct'
    )
  )
);