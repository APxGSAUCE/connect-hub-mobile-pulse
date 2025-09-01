-- Fix notifications type constraint to include 'security' type
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with 'security' type included
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text, 'security'::text]));