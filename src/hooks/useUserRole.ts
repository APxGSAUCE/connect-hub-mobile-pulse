import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: string;
  department_id: string | null;
  is_department_head: boolean;
  can_create_messages: boolean;
  can_create_events: boolean;
  can_manage_users: boolean;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setUserRole(null);
      return;
    }

    try {
      // Fetch role from user_roles table (secure pattern)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: false }) // Get highest role first
        .limit(1)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        throw roleError;
      }

      // Fetch profile data for department info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      // Check if user is department head
      let isDepartmentHead = false;
      if (profileData?.department_id) {
        const { data: deptData } = await supabase
          .from('departments')
          .select('head_user_id')
          .eq('id', profileData.department_id)
          .maybeSingle();
        
        isDepartmentHead = deptData?.head_user_id === user.id;
      }

      const role = roleData?.role || 'employee';

      const permissions: UserRole = {
        role,
        department_id: profileData?.department_id || null,
        is_department_head: isDepartmentHead,
        can_create_messages: ['super_admin', 'admin'].includes(role) || isDepartmentHead,
        can_create_events: ['super_admin', 'admin'].includes(role) || isDepartmentHead,
        can_manage_users: ['super_admin', 'admin'].includes(role)
      };

      setUserRole(permissions);
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Default to basic employee permissions on error
      setUserRole({
        role: 'employee',
        department_id: null,
        is_department_head: false,
        can_create_messages: false,
        can_create_events: false,
        can_manage_users: false
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  return { userRole, loading, refetch: fetchUserRole };
};