-- Complete Role Escalation Prevention Policies

-- Users can update their own profile EXCEPT role field
CREATE POLICY "Users can update their own profile (non-role fields)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Only admins can update user roles  
CREATE POLICY "Admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  )
);

-- Create audit logging function for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes for security audit
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.notifications (
      user_id,
      title, 
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      NEW.id,
      'Role Updated',
      'Your role has been changed from ' || COALESCE(OLD.role, 'none') || ' to ' || COALESCE(NEW.role, 'none'),
      'security',
      'role_change',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change logging
CREATE TRIGGER profile_role_change_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.log_role_change();