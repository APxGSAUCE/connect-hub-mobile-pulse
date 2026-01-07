-- Fix 1: Update RLS policies to use has_role() instead of querying profiles.role

-- Drop and recreate messages INSERT policy
DROP POLICY IF EXISTS "Admins can send messages to any group" ON messages;

CREATE POLICY "Admins can send messages to any group" ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Drop and recreate event_participants SELECT policy that uses profiles.role
DROP POLICY IF EXISTS "Admins can view all participants" ON event_participants;

CREATE POLICY "Admins can view all participants" ON event_participants
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Drop and recreate chat_groups INSERT policy that uses profiles.role
DROP POLICY IF EXISTS "Admins can create groups" ON chat_groups;

CREATE POLICY "Admins can create groups" ON chat_groups
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  OR created_by = auth.uid()
);

-- Fix 2: Secure the files storage bucket
UPDATE storage.buckets 
SET 
  public = false,
  file_size_limit = 10485760,  -- 10MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE name = 'files';

-- Drop existing storage policies and create authenticated-only policies
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create secure storage policies for files bucket
CREATE POLICY "Authenticated users can view files" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'files');

CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their files" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete files" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

-- Fix 3: Add search_path to functions that are missing it
CREATE OR REPLACE FUNCTION public.get_department_colleagues()
RETURNS TABLE(id uuid, first_name text, last_name text, "position" text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_dept_id uuid;
BEGIN
  -- Get current user's department
  SELECT p.department_id INTO user_dept_id
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Return basic public info for department colleagues
  IF user_dept_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p."position",
      p.avatar_url
    FROM profiles p
    WHERE p.department_id = user_dept_id
    AND p.id != auth.uid()
    AND p.status = 'active';
  END IF;
END;
$function$;