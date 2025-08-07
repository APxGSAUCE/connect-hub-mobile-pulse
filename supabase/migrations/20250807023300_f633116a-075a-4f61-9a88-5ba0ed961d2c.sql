-- Create table for message read receipts
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for message read receipts
CREATE POLICY "Users can view read receipts for their groups" 
ON public.message_read_receipts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
    WHERE m.id = message_read_receipts.message_id 
    AND cgm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own read receipts" 
ON public.message_read_receipts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read receipts" 
ON public.message_read_receipts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.message_read_receipts 
ADD CONSTRAINT fk_message_read_receipts_message_id 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- Create function to automatically mark messages as read when fetched
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_id_param uuid, user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Create function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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