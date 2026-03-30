
-- FIX 1: Remove unauthenticated file access (public-role SELECT policy)
DROP POLICY IF EXISTS "Anyone can view uploaded files" ON storage.objects;

-- Drop duplicate public-role UPDATE policy
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;

-- FIX 2: Replace overly permissive UPDATE/DELETE with ownership checks
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- Ownership-based UPDATE policy
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files'
  AND (
    name LIKE 'avatars/' || auth.uid()::text || '-%'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Ownership-based DELETE policy
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'files'
  AND (
    name LIKE 'avatars/' || auth.uid()::text || '-%'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- FIX 3: Remove profiles from Realtime publication (contains sensitive data)
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
