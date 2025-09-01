-- Just add the basic columns we need for now, without changing existing structure
-- We'll implement role-based features gradually

-- Add new columns to profiles table for verification system
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS verification_documents JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Update departments table
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES public.profiles(id);

-- Create simplified get_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_conversations', (
      SELECT COUNT(DISTINCT cgm.group_id) 
      FROM public.chat_group_members cgm
      WHERE cgm.user_id = user_id
    ),
    'unread_conversations', (
      SELECT COUNT(DISTINCT m.group_id) 
      FROM public.messages m
      JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
      WHERE cgm.user_id = user_id 
        AND m.sender_id != user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.message_read_receipts mrr
          WHERE mrr.message_id = m.id AND mrr.user_id = user_id
        )
    ),
    'upcoming_events', (
      SELECT COUNT(*) FROM public.events e
      WHERE e.start_date > NOW()
    ),
    'total_employees', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE status = 'active'
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM public.notifications 
      WHERE user_id = user_id AND is_read = false
    )
  ) INTO result;

  RETURN result;
END;
$function$;