-- Drop dependent policies first
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simple working version first, without complex role changes
-- Just add the new columns we need
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS verification_documents JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Create simplified dashboard stats function to fix immediate errors
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

-- Recreate essential policies using existing role values
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() AND p2.role = 'admin'
  )
);

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles profiles_1
    WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin'
  )
);

CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);