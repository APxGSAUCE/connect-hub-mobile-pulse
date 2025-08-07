-- Add avatar_url column to profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Create event_participants table for managing event attendees
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'maybe')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS for event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_participants
CREATE POLICY "Users can view event participants"
  ON public.event_participants FOR SELECT
  USING (true);

CREATE POLICY "Event creators can manage participants"
  ON public.event_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_participants.event_id 
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participation status"
  ON public.event_participants FOR UPDATE
  USING (auth.uid() = user_id);