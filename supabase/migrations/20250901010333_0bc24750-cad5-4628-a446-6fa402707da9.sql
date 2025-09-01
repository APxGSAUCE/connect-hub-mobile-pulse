-- Drop the existing get_dashboard_stats function first
DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

-- Add role and status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS verification_documents JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Update role enum to include all required roles
DO $$ 
BEGIN
  -- Check if the type already exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DEPT_HEAD', 'EMPLOYEE');
  ELSE
    -- Add new values if they don't exist
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DEPT_HEAD';
  END IF;
END $$;

-- Update status enum to include verification statuses
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED', 'active', 'inactive');
  ELSE
    ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';
    ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'APPROVED';
    ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'REJECTED';
    ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
  END IF;
END $$;

-- Update profiles table to use the new enums
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::user_role,
ALTER COLUMN status TYPE user_status USING status::user_status;

-- Update departments table to include head_user_id
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES public.profiles(id);

-- Create user_verifications table for tracking verification workflow
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  documents JSONB,
  status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  admin_notes TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on user_verifications
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user_verifications
CREATE POLICY "Users can view their own verification requests" 
ON public.user_verifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all verification requests" 
ON public.user_verifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Super admins can update verification requests" 
ON public.user_verifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "System can create verification requests" 
ON public.user_verifications 
FOR INSERT 
WITH CHECK (true);

-- Update messages table to include department-based messaging
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'group', -- 'group', 'department', 'all_employees'
ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;

-- Update events table for department-specific events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS visibility_level TEXT DEFAULT 'public', -- 'public', 'department', 'private'
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create improved get_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  result JSON;
  user_department UUID;
  user_role TEXT;
BEGIN
  -- Get user's department and role
  SELECT department_id, role::text INTO user_department, user_role
  FROM public.profiles WHERE id = user_id;

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
        AND (
          e.visibility_level = 'public' OR
          (e.visibility_level = 'department' AND e.department_id = user_department) OR
          e.created_by = user_id OR
          ep.user_id IS NOT NULL
        )
    ),
    'total_employees', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE status IN ('APPROVED', 'active')
        AND (
          user_role IN ('SUPER_ADMIN', 'ADMIN') OR
          (user_role = 'DEPT_HEAD' AND department_id = user_department) OR
          department_id = user_department
        )
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM public.notifications 
      WHERE user_id = user_id AND is_read = false
    ),
    'pending_verifications', (
      CASE 
        WHEN user_role = 'SUPER_ADMIN' THEN (
          SELECT COUNT(*) FROM public.user_verifications 
          WHERE status = 'PENDING_VERIFICATION'
        )
        ELSE 0
      END
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- Update RLS policies for role-based access

-- Update profiles RLS policies for new role system
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view department colleagues basic info" ON public.profiles;

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() AND p2.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Admins can view approved employees" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() AND p2.role IN ('ADMIN', 'SUPER_ADMIN')
  ) AND status IN ('APPROVED', 'active')
);

CREATE POLICY "Department heads can view their department" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() 
      AND p2.role = 'DEPT_HEAD' 
      AND p2.department_id = profiles.department_id
  ) AND status IN ('APPROVED', 'active')
);

CREATE POLICY "Employees can view department colleagues" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND department_id IS NOT NULL 
  AND department_id = (
    SELECT department_id FROM public.profiles 
    WHERE id = auth.uid()
  )
  AND status IN ('APPROVED', 'active')
);

-- Update messages RLS for role-based messaging
CREATE POLICY "Role-based message creation" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Super admin can message anyone
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    ) OR
    -- Admin can send announcements
    (is_announcement = true AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )) OR
    -- Department head can message their department
    (department_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role = 'DEPT_HEAD' 
        AND department_id = messages.department_id
    )) OR
    -- Regular group messaging (existing functionality)
    (department_id IS NULL AND is_announcement = false AND EXISTS (
      SELECT 1 FROM public.chat_group_members
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    ))
  )
);

-- Update events RLS for role-based event creation
CREATE POLICY "Role-based event creation" 
ON public.events 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND (
    -- Super admin can create any event
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    ) OR
    -- Admin can create company-wide events
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ) OR
    -- Department head can create department events
    (department_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role = 'DEPT_HEAD' 
        AND department_id = events.department_id
    ))
  )
);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON public.user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role::text FROM public.profiles WHERE id = user_id;
$function$;

-- Create function to check if user can manage roles
CREATE OR REPLACE FUNCTION public.can_manage_roles(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'SUPER_ADMIN'
  );
$function$;