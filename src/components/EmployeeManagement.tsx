
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeList } from "./EmployeeList";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  status: 'active' | 'muted' | 'blocked' | 'inactive';
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

const EmployeeManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    if (!roleLoading && userRole) {
      fetchEmployees();
      fetchDepartments();
    }
  }, [roleLoading, userRole]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let data, error;
      
      // Check if user has admin/super_admin privileges or is department head
      if (userRole?.can_manage_users) {
        // For admins and super_admins, try to get full employee details
        const result = await supabase.rpc('get_employee_details_admin');
        data = result.data;
        error = result.error;
      } else if (userRole?.is_department_head) {
        // For department heads, get department colleagues
        const result = await supabase.rpc('get_department_colleagues');
        data = result.data;
        error = result.error;
      } else {
        // For regular employees, get limited colleague info
        const result = await supabase.rpc('get_department_colleagues');
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      
      // Apply department filter if needed
      let filteredData = data || [];
      if (selectedDepartment !== 'all') {
        filteredData = filteredData.filter(emp => emp.department_id === selectedDepartment);
      }
      
      const typedEmployees = filteredData.map(emp => ({
        ...emp,
        status: emp.status as 'active' | 'muted' | 'blocked' | 'inactive'
      }));

      setEmployees(typedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees. Please check your permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments...');
      
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');

      if (error) {
        console.error('Error fetching departments:', error);
        throw error;
      }

      console.log('Departments fetched:', data);
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments.",
        variant: "destructive"
      });
    }
  };


  const updateEmployeeStatus = async (employeeId: string, status: Employee['status']) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', employeeId);

      if (error) throw error;

      setEmployees(employees.map(emp =>
        emp.id === employeeId ? { ...emp, status } : emp
      ));

      toast({
        title: "Success",
        description: `Employee status updated to ${status}.`,
      });
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast({
        title: "Error",
        description: "Failed to update employee status.",
        variant: "destructive"
      });
    }
  };

  const startDirectMessage = async (employeeId: string, employeeName: string) => {
    try {
      const { data, error } = await supabase.rpc('create_direct_message_group', {
        other_user_id: employeeId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Direct message with ${employeeName} started.`,
      });
    } catch (error) {
      console.error('Error starting direct message:', error);
      toast({
        title: "Error",
        description: "Failed to start direct message.",
        variant: "destructive"
      });
    }
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartment(departmentId);
    // Re-fetch employees with new department filter
    setTimeout(() => {
      fetchEmployees();
    }, 100);
  };

  if (loading || roleLoading) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
          <p className="text-gray-600">Manage your team members</p>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={handleDepartmentChange}
        departments={departments}
      />

      {/* Employee List */}
      <EmployeeList
        employees={filteredEmployees}
        isAdmin={userRole?.can_manage_users || false}
        onDirectMessage={startDirectMessage}
        onStatusUpdate={updateEmployeeStatus}
      />
    </div>
  );
};

export default EmployeeManagement;
