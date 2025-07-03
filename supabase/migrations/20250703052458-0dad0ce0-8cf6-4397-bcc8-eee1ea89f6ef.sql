
-- Fix the infinite recursion in chat_group_members policies
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Group admins can manage members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.chat_group_members;

-- Create a security definer function to safely check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_group_members 
    WHERE group_id = group_id_param AND user_id = user_id_param
  );
$$;

-- Create a security definer function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_group_members 
    WHERE group_id = group_id_param AND user_id = user_id_param AND role = 'admin'
  );
$$;

-- Create new non-recursive policies for chat_group_members
CREATE POLICY "Users can view group members for their groups" 
  ON public.chat_group_members 
  FOR SELECT 
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can manage members" 
  ON public.chat_group_members 
  FOR ALL 
  USING (
    public.is_group_admin(group_id, auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.chat_groups WHERE id = group_id AND created_by = auth.uid())
  );

-- Fix the chat_groups policies to avoid recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.chat_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.chat_groups;

CREATE POLICY "Users can view groups they are members of" 
  ON public.chat_groups 
  FOR SELECT 
  USING (
    created_by = auth.uid() OR 
    public.is_group_member(id, auth.uid())
  );

CREATE POLICY "Group admins can update groups" 
  ON public.chat_groups 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR 
    public.is_group_admin(id, auth.uid())
  );

-- Fix the create_direct_message_group function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.create_direct_message_group(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  existing_group_id UUID;
  new_group_id UUID;
BEGIN
  -- Check if direct message group already exists between these two users
  SELECT cg.id INTO existing_group_id
  FROM public.chat_groups cg
  WHERE cg.group_type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.chat_group_members cgm1 
      WHERE cgm1.group_id = cg.id AND cgm1.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_group_members cgm2 
      WHERE cgm2.group_id = cg.id AND cgm2.user_id = other_user_id
    )
    AND (SELECT COUNT(*) FROM public.chat_group_members WHERE group_id = cg.id) = 2;

  -- If group exists, return it
  IF existing_group_id IS NOT NULL THEN
    RETURN existing_group_id;
  END IF;

  -- Create new direct message group
  INSERT INTO public.chat_groups (name, group_type, created_by, description)
  VALUES (
    'Direct Message', 
    'direct', 
    auth.uid(),
    'Direct conversation'
  )
  RETURNING id INTO new_group_id;

  -- Add both users to the group
  INSERT INTO public.chat_group_members (group_id, user_id, role)
  VALUES 
    (new_group_id, auth.uid(), 'admin'),
    (new_group_id, other_user_id, 'admin');

  RETURN new_group_id;
END;
$function$;

-- Add missing INSERT policy for profiles
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Enable realtime for better chat experience
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_groups REPLICA IDENTITY FULL;
ALTER TABLE public.chat_group_members REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;

-- Update PWA manifest for better mobile experience
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;
