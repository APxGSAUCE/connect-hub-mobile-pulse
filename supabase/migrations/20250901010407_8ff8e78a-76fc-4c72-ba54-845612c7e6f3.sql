-- Fix the role column issue by handling existing data properly
-- First, add new columns without modifying existing ones
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS verification_documents JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

-- Create role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DEPT_HEAD', 'EMPLOYEE');
  END IF;
END $$;

-- Create status enum if it doesn't exist  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED', 'active', 'inactive');
  END IF;
END $$;

-- Update existing profiles to use EMPLOYEE role by default if NULL
UPDATE public.profiles SET role = 'employee' WHERE role IS NULL;

-- Now safely change the column type with a proper default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'EMPLOYEE',
ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role = 'admin' THEN 'ADMIN'::user_role
    WHEN role = 'employee' THEN 'EMPLOYEE'::user_role
    ELSE 'EMPLOYEE'::user_role
  END;

-- Update status column
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'PENDING_VERIFICATION',
ALTER COLUMN status TYPE user_status USING 
  CASE 
    WHEN status = 'active' THEN 'APPROVED'::user_status
    WHEN status = 'inactive' THEN 'SUSPENDED'::user_status
    ELSE 'PENDING_VERIFICATION'::user_status
  END;

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

-- Enable RLS on user_verifications
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Update messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'group',
ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;

-- Update events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS visibility_level TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;