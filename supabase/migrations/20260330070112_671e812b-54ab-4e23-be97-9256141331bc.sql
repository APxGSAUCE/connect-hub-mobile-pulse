
-- FIX 1: Restrict file SELECT to ownership-based access
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
CREATE POLICY "Authenticated users can view their own files"
ON storage.objects FOR SELECT
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

-- FIX 2: Replace department colleagues direct table access with view
-- Since RLS can't restrict columns, create a secure view
DROP POLICY IF EXISTS "Users can view department colleagues basic info" ON public.profiles;

-- Create a view with only non-sensitive columns for department colleagues
CREATE OR REPLACE VIEW public.department_colleagues_view AS
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.position,
  p.avatar_url,
  p.department_id
FROM public.profiles p
WHERE p.department_id = get_current_user_department()
  AND p.id != auth.uid()
  AND p.status = 'active';

-- The app already uses get_department_colleagues() function which only returns safe columns.
-- Without a department colleagues SELECT policy, regular users can only see:
-- 1. Their own profile (via "Users can view their own profile")
-- 2. Department colleague data via the secure get_department_colleagues() function
-- This eliminates direct table-level access to sensitive columns for colleagues.
