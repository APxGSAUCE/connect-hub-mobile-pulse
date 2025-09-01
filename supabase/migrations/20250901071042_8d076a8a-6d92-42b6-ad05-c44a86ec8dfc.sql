-- Fix infinite recursion in RLS policies and add image support to events

-- First, drop problematic policies to fix infinite recursion
DROP POLICY IF EXISTS "Users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can create chat groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.messages;

-- Add image_url column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Recreate policies without recursive calls to avoid infinite recursion
-- Events policies - use direct role checks without function calls
CREATE POLICY "Users can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND (
    -- Direct role check from profiles table
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
    OR
    -- Direct department head check
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON p.department_id = d.id
      WHERE p.id = auth.uid() 
      AND d.head_user_id = auth.uid()
    )
  )
);

-- Chat groups policies
CREATE POLICY "Users can create chat groups" 
ON public.chat_groups 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND (
    -- Direct role check from profiles table
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
    OR
    -- Direct department head check
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON p.department_id = d.id
      WHERE p.id = auth.uid() 
      AND d.head_user_id = auth.uid()
    )
  )
);

-- Messages policies - simplified to avoid recursion
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
    -- Allow if there are existing messages in the group (continuing conversation)
    EXISTS (
      SELECT 1 FROM public.messages m2
      WHERE m2.group_id = messages.group_id 
      AND m2.id != messages.id
    )
    OR
    -- Allow if user has permission to create new conversations
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
    OR
    -- Allow if user is department head
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON p.department_id = d.id
      WHERE p.id = auth.uid() 
      AND d.head_user_id = auth.uid()
    )
  )
);