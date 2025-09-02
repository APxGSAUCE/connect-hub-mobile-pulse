-- Fix events event_type constraint to include 'other' type
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_event_type_check;

-- Add updated constraint with all necessary event types
ALTER TABLE public.events 
ADD CONSTRAINT events_event_type_check 
CHECK (event_type = ANY (ARRAY['meeting'::text, 'conference'::text, 'workshop'::text, 'training'::text, 'social'::text, 'other'::text]));