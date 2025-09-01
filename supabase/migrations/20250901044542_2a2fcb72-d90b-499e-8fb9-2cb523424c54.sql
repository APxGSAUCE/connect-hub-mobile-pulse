-- Add permission checks for message and event creation

-- Update RLS policies for messages to include role-based creation restrictions
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.messages;

CREATE POLICY "Users can send messages to their groups"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.chat_group_members 
    WHERE group_id = messages.group_id 
    AND user_id = auth.uid()
  )
  AND (
    -- Check if user has permission to create new groups (for the first message scenario)
    -- or if they're just replying to an existing conversation
    EXISTS (
      SELECT 1 FROM public.messages m2 
      WHERE m2.group_id = messages.group_id 
      AND m2.id != messages.id
    )
    OR
    -- User has permission to create messages (admin, super_admin, or department head)
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.departments d ON p.department_id = d.id
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'super_admin')
        OR d.head_user_id = auth.uid()
      )
    )
  )
);

-- Update RLS policies for events to include role-based creation restrictions  
DROP POLICY IF EXISTS "Users can create events" ON public.events;

CREATE POLICY "Users can create events"
ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'super_admin')
      OR d.head_user_id = auth.uid()
    )
  )
);

-- Update RLS policies for chat groups to include role-based creation restrictions
DROP POLICY IF EXISTS "Users can create chat groups" ON public.chat_groups;

CREATE POLICY "Users can create chat groups"
ON public.chat_groups
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'super_admin')
      OR d.head_user_id = auth.uid()
    )
  )
);

-- Create function to check if user can create messages/events
CREATE OR REPLACE FUNCTION public.can_user_create_content()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'super_admin')
      OR d.head_user_id = auth.uid()
    )
  );
$function$;