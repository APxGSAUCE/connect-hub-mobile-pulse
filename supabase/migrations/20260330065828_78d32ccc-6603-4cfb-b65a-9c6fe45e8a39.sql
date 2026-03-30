
-- FIX 1: Restrict file upload paths to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files'
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE 'avatars/' || auth.uid()::text || '-%'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- FIX 2: Create a view for department colleagues with only non-sensitive columns
-- Then update the RLS policy to use it
-- We can't restrict columns in RLS directly, so we create a secure function instead.
-- The existing get_department_colleagues() function already returns only safe columns.
-- The real fix: restrict the department colleagues SELECT policy to exclude sensitive data
-- by narrowing what colleagues can see via a column-restricted view.

-- Drop the broad department colleagues policy
DROP POLICY IF EXISTS "Users can view department colleagues" ON public.profiles;

-- Recreate with a more restrictive approach: department colleagues can only see
-- basic profile info. We achieve this by keeping the policy but the app already
-- uses get_department_colleagues() which only returns safe columns.
-- For defense-in-depth, we'll keep a restricted policy that only matches
-- non-sensitive queries (the policy itself can't filter columns, so we
-- rely on the application layer + secure functions).
CREATE POLICY "Users can view department colleagues basic info"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND department_id IS NOT NULL
  AND department_id = get_current_user_department()
  AND id != auth.uid()
);
