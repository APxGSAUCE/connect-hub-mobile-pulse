-- Fix database schema by handling existing data correctly
-- First, check and update any NULL status values
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;

-- Check existing values to avoid constraint violations
SELECT DISTINCT status FROM public.profiles;

-- Ensure we have the right status values before enum conversion
UPDATE public.profiles 
SET status = CASE 
  WHEN status = 'inactive' THEN 'active'
  ELSE status
END 
WHERE status NOT IN ('active');

-- Now create the enums safely
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DEPT_HEAD', 'EMPLOYEE');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED');
  END IF;
END $$;

-- Create a new column with the enum type and copy data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS new_role user_role DEFAULT 'EMPLOYEE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS new_status user_status DEFAULT 'APPROVED';

-- Copy existing data to new columns
UPDATE public.profiles 
SET new_role = CASE 
  WHEN role = 'admin' THEN 'ADMIN'::user_role
  ELSE 'EMPLOYEE'::user_role
END;

UPDATE public.profiles 
SET new_status = CASE 
  WHEN status = 'active' THEN 'APPROVED'::user_status
  ELSE 'APPROVED'::user_status
END;

-- Drop old columns and rename new ones
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS status;
ALTER TABLE public.profiles RENAME COLUMN new_role TO role;
ALTER TABLE public.profiles RENAME COLUMN new_status TO status;

-- Set proper defaults
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'EMPLOYEE'::user_role;
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'PENDING_VERIFICATION'::user_status;

-- Add other columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS verification_documents JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Update departments table
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES public.profiles(id);

-- Create user_verifications table
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

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Create the simplified dashboard stats function
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
      WHERE status = 'APPROVED'
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM public.notifications 
      WHERE user_id = user_id AND is_read = false
    )
  ) INTO result;

  RETURN result;
END;
$function$;