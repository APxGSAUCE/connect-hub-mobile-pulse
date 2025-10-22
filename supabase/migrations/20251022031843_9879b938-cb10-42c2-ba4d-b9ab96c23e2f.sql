-- ========================================
-- CRITICAL SECURITY FIX: Implement Proper Role System
-- Roles MUST be in a separate table to prevent privilege escalation
-- ========================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('employee', 'dept_head', 'admin', 'super_admin');

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'dept_head' THEN 2
    ELSE 1
  END DESC
  LIMIT 1
$$;

-- 5. Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role = 'super_admin' THEN 'super_admin'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'dept_head' THEN 'dept_head'::app_role
    ELSE 'employee'::app_role
  END
FROM public.profiles
WHERE id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Update existing functions to use new role system
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'super_admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role);
$$;

-- 7. Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 8. Update can_user_create_content function
CREATE OR REPLACE FUNCTION public.can_user_create_content()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS(
      SELECT 1 FROM public.departments 
      WHERE head_user_id = auth.uid()
    );
$$;

-- 9. Update validate_role_update trigger function
CREATE OR REPLACE FUNCTION public.validate_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admins can update roles now
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can change user roles'
      USING ERRCODE = '42501';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 10. Create trigger for user_roles
DROP TRIGGER IF EXISTS validate_role_change ON public.user_roles;
CREATE TRIGGER validate_role_change
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_update();

-- 11. Update get_employee_details_admin function to work with new role system
CREATE OR REPLACE FUNCTION public.get_employee_details_admin()
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  "position" TEXT,
  status TEXT,
  department_id UUID,
  employee_id TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin or super_admin
  IF NOT can_manage_users() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p."position",
    p.status,
    p.department_id,
    p.employee_id,
    p.avatar_url
  FROM profiles p
  WHERE p.status IS NOT NULL;
END;
$$;

-- 12. Create function to sync role from profiles to user_roles (for backwards compatibility)
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When profile role is updated, sync to user_roles
  IF NEW.role IS NOT NULL AND NEW.role != OLD.role THEN
    -- Delete old role
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      CASE NEW.role
        WHEN 'super_admin' THEN 'super_admin'::app_role
        WHEN 'admin' THEN 'admin'::app_role
        WHEN 'dept_head' THEN 'dept_head'::app_role
        ELSE 'employee'::app_role
      END
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync profile role changes
DROP TRIGGER IF EXISTS sync_role_to_user_roles ON public.profiles;
CREATE TRIGGER sync_role_to_user_roles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.sync_profile_role();

-- 13. Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_users() TO authenticated;