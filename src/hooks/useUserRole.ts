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
        const { data, error } = await supabase
          .from('profiles')
          .select('role, department_id, departments!profiles_department_id_fkey(head_user_id)')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const isDepartmentHead = data.departments?.head_user_id === user.id;
        const role = data.role || 'employee';

        const permissions: UserRole = {
          role,
          department_id: data.department_id,
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