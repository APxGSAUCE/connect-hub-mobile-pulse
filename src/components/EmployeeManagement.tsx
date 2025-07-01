import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, Users, Mail, Phone, MoreVertical, Ban, 
  Volume2, CheckCircle, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (selectedDepartment !== 'all') {
        query = query.eq('department_id', selectedDepartment);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const typedEmployees = (data || []).map(emp => ({
        ...emp,
        status: emp.status as 'active' | 'muted' | 'blocked' | 'inactive'
      }));

      setEmployees(typedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
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

      // Optimistically update the employee status in the local state
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartment(departmentId);
    fetchEmployees();
  };

  if (loading) {
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
      {/* Header and Filters */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
          <p className="text-gray-600">Manage your team members</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 items-center">
        <div className="flex items-center space-x-2">
          <Label htmlFor="search">Search:</Label>
          <Input
            type="text"
            id="search"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="department">Department:</Label>
          <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{employee.position || 'No position'}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startDirectMessage(employee.id, `${employee.first_name} ${employee.last_name}`)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  {currentUser?.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateEmployeeStatus(employee.id, 'muted')}
                          disabled={employee.status === 'muted'}
                        >
                          <Volume2 className="w-4 h-4 mr-2" />
                          Mute
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateEmployeeStatus(employee.id, 'blocked')}
                          disabled={employee.status === 'blocked'}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Block
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateEmployeeStatus(employee.id, 'active')}
                          disabled={employee.status === 'active'}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-500">
                    <Mail className="w-4 h-4 mr-1 inline-block" />
                    {employee.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-500">
                    <Phone className="w-4 h-4 mr-1 inline-block" />
                    {employee.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      employee.status === 'active' ? 'bg-green-100 text-green-600' :
                      employee.status === 'muted' ? 'bg-yellow-100 text-yellow-600' :
                      employee.status === 'blocked' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-600">
            There are no employees matching your search criteria.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
