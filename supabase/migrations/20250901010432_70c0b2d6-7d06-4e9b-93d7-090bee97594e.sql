-- Fix the role column type conversion issue
-- First, create a backup of existing data and convert roles to new format
UPDATE public.profiles 
SET role = 'EMPLOYEE' 
WHERE role = 'employee';

UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE role = 'admin';

-- Drop the default constraint temporarily
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Now create the user_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DEPT_HEAD', 'EMPLOYEE');
  END IF;
END $$;

-- Convert the column to the new enum type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set the new default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'EMPLOYEE'::user_role;

-- Do the same for status
UPDATE public.profiles 
SET status = 'APPROVED' 
WHERE status = 'active';

UPDATE public.profiles 
SET status = 'PENDING_VERIFICATION' 
WHERE status = 'inactive';

-- Create status enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED', 'active', 'inactive');
  END IF;
END $$;

ALTER TABLE public.profiles ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.profiles 
ALTER COLUMN status TYPE user_status USING status::user_status;
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'PENDING_VERIFICATION'::user_status;

-- Add new columns
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

-- Policies for user_verifications
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

-- Create functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role::text FROM public.profiles WHERE id = user_id;
$function$;

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