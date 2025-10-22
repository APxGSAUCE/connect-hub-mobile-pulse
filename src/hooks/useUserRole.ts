import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch role from new user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role', { ascending: false }) // Get highest role first
          .limit(1)
          .maybeSingle();

        if (roleError) throw roleError;

        // Fetch profile data for department info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('department_id, departments!profiles_department_id_fkey(head_user_id)')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const isDepartmentHead = profileData.departments?.head_user_id === user.id;
        const role = roleData?.role || 'employee';

        const permissions: UserRole = {
          role,
          department_id: profileData.department_id,
          is_department_head: isDepartmentHead,
          can_create_messages: ['super_admin', 'admin'].includes(role) || isDepartmentHead,
          can_create_events: ['super_admin', 'admin'].includes(role) || isDepartmentHead,
          can_manage_users: ['super_admin', 'admin'].includes(role)
        };

        setUserRole(permissions);
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Default to basic employee permissions
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
    };

    fetchUserRole();
  }, [user]);

  return { userRole, loading };
};