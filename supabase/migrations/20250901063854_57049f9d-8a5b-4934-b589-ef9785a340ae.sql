-- Fix remaining functions with mutable search paths
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_id_param uuid, user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only insert if the user is a member of the group and hasn't already read the message
  INSERT INTO public.message_read_receipts (message_id, user_id)
  SELECT message_id_param, user_id_param
  WHERE EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
    WHERE m.id = message_id_param 
    AND cgm.user_id = user_id_param
    AND m.sender_id != user_id_param -- Don't mark own messages as read
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.message_read_receipts 
    WHERE message_id = message_id_param AND user_id = user_id_param
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.messages m
  JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
  WHERE cgm.user_id = user_id_param
  AND m.sender_id != user_id_param -- Don't count own messages
  AND NOT EXISTS (
    SELECT 1 FROM public.message_read_receipts mrr
    WHERE mrr.message_id = m.id AND mrr.user_id = user_id_param
  );
  
  RETURN COALESCE(unread_count, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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