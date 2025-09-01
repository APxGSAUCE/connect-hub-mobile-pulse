-- Fix Critical Security Issues: Event and Participant Visibility + Role Escalation Prevention

-- 1. Fix Event Visibility - Replace overly permissive policy
DROP POLICY IF EXISTS "Users can view all events" ON public.events;

-- Create restricted event visibility policy
CREATE POLICY "Users can view events they participate in or created" 
ON public.events 
FOR SELECT 
USING (
  -- Event creator can see their own events
  auth.uid() = created_by 
  OR 
  -- Participants can see events they're invited to
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = events.id AND ep.user_id = auth.uid()
  )
  OR
  -- Admins can see all events
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  )
);

-- 2. Fix Event Participants Exposure - Replace overly permissive policy  
DROP POLICY IF EXISTS "Users can view event participants" ON public.event_participants;

-- Create restricted participant visibility policy
CREATE POLICY "Users can view participants for accessible events" 
ON public.event_participants 
FOR SELECT 
USING (
  -- Event creator can see all participants
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_participants.event_id AND e.created_by = auth.uid()
  )
  OR
  -- Users can only see participants for events they're also participating in
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = event_participants.event_id 
    AND ep.user_id = auth.uid()
  )
  OR
  -- Admins can see all participants
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  )
);

-- 3. Prevent Role Escalation - Create separate policies for profile updates
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;