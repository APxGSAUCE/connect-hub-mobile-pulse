-- Fix ambiguous column reference in get_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_conversations', (
      SELECT COUNT(DISTINCT cgm.group_id) 
      FROM public.chat_group_members cgm
      WHERE cgm.user_id = user_id_param
    ),
    'unread_conversations', (
      SELECT COUNT(DISTINCT m.group_id) 
      FROM public.messages m
      JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
      WHERE cgm.user_id = user_id_param 
        AND m.sender_id != user_id_param
        AND NOT EXISTS (
          SELECT 1 FROM public.message_read_receipts mrr
          WHERE mrr.message_id = m.id AND mrr.user_id = user_id_param
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
      SELECT COUNT(*) FROM public.notifications n
      WHERE n.user_id = user_id_param AND n.is_read = false
    )
  ) INTO result;

  RETURN result;
END;
$function$;