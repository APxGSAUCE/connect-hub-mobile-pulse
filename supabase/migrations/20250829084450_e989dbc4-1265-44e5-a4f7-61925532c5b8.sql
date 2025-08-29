-- Update the dashboard stats function to count conversations, not individual messages
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
      LEFT JOIN public.event_participants ep ON e.id = ep.event_id AND ep.user_id = user_id
      WHERE e.start_date > NOW()
        AND (ep.user_id IS NULL OR ep.status IN ('invited', 'accepted', 'maybe'))
    ),
    'total_employees', (
      SELECT COUNT(*) FROM public.profiles WHERE status = 'active'
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM public.notifications WHERE user_id = user_id AND is_read = false
    )
  ) INTO result;

  RETURN result;
END;
$function$;