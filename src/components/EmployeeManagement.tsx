import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Search, Filter, MessageSquare, UserCheck, UserX, 
  Volume2, VolumeX, Building, Phone, Mail, MapPin, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  status: 'active' | 'muted' | 'blocked' | 'inactive';
  role: 'admin' | 'manager' | 'employee';
  department: {
    id: string;
    name: string;
    description: string;
  } | null;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

const EmployeeManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserRole(data?.role || 'employee');
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          position,
          status,
          role,
          created_at,
          department:departments(id, name, description)
        `)
        .order('first_name');

      if (error) throw error;
      
      // Type assertion to ensure proper typing
      const typedEmployees = (data || []).map(emp => ({
        ...emp,
        status: emp.status as 'active' | 'muted' | 'blocked' | 'inactive',
        role: emp.role as 'admin' | 'manager' | 'employee'
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
    }
  };

  const updateEmployeeStatus = async (employeeId: string, newStatus: string) => {
    if (userRole !== 'admin' && userRole !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update employee status.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', employeeId);

      if (error) throw error;

      setEmployees(employees.map(emp => 
        emp.id === employeeId ? { ...emp, status: newStatus as 'active' | 'muted' | 'blocked' | 'inactive' } : emp
      ));

      toast({
        title: "Status Updated",
        description: `Employee status updated to ${newStatus}.`,
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

  const startDirectMessage = async (employeeId: string) => {
    try {
      const { data, error } = await supabase.rpc('create_direct_message_group', {
        other_user_id: employeeId
      });

      if (error) throw error;

      toast({
        title: "Message Started",
        description: "Direct message conversation created.",
      });
      
      // In a real app, you would navigate to the message view
      console.log('Created group:', data);
    } catch (error) {
      console.error('Error creating direct message:', error);
      toast({
        title: "Error",
        description: "Failed to start direct message.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'muted': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || employee.department?.id === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const employeesByDepartment = departments.map(dept => ({
    ...dept,
    employees: filteredEmployees.filter(emp => emp.department?.id === dept.id)
  }));

  const employeesWithoutDepartment = filteredEmployees.filter(emp => !emp.department);

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Directory</h2>
          <p className="text-gray-600">Manage employees and departments</p>
        </div>
      </div>

      {/* Employee Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-gray-600">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-sm text-gray-600">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'blocked').length}</p>
                <p className="text-sm text-gray-600">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="muted">Muted</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee List by Department */}
      <div className="space-y-6">
        {employeesByDepartment.map((department) => (
          department.employees.length > 0 && (
            <Card key={department.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>{department.name}</span>
                  <Badge variant="secondary">{department.employees.length}</Badge>
                </CardTitle>
                <CardDescription>{department.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {department.employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </h4>
                            <Badge className={getRoleColor(employee.role)} variant="secondary">
                              {employee.role}
                            </Badge>
                            <Badge className={getStatusColor(employee.status)} variant="secondary">
                              {employee.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{employee.position || 'No position set'}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            {employee.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{employee.email}</span>
                              </div>
                            )}
                            {employee.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{employee.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startDirectMessage(employee.id)}
                          disabled={employee.id === user?.id}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>

                        {(userRole === 'admin' || userRole === 'manager') && employee.id !== user?.id && (
                          <div className="flex space-x-1">
                            {employee.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateEmployeeStatus(employee.id, 'muted')}
                                  className="text-yellow-600 hover:text-yellow-700"
                                >
                                  <VolumeX className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateEmployeeStatus(employee.id, 'blocked')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {employee.status === 'muted' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateEmployeeStatus(employee.id, 'active')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateEmployeeStatus(employee.id, 'blocked')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {employee.status === 'blocked' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEmployeeStatus(employee.id, 'active')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ))}

        {/* Employees without department */}
        {employeesWithoutDepartment.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Unassigned Department</span>
                <Badge variant="secondary">{employeesWithoutDepartment.length}</Badge>
              </CardTitle>
              <CardDescription>Employees not assigned to any department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {employeesWithoutDepartment.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </h4>
                          <Badge className={getRoleColor(employee.role)} variant="secondary">
                            {employee.role}
                          </Badge>
                          <Badge className={getStatusColor(employee.status)} variant="secondary">
                            {employee.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{employee.position || 'No position set'}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          {employee.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startDirectMessage(employee.id)}
                        disabled={employee.id === user?.id}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Message
                      </Button>

                      {(userRole === 'admin' || userRole === 'manager') && employee.id !== user?.id && (
                        <div className="flex space-x-1">
                          {employee.status === 'active' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEmployeeStatus(employee.id, 'muted')}
                                className="text-yellow-600 hover:text-yellow-700"
                              >
                                <VolumeX className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEmployeeStatus(employee.id, 'blocked')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {employee.status === 'muted' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEmployeeStatus(employee.id, 'active')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Volume2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEmployeeStatus(employee.id, 'blocked')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {employee.status === 'blocked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateEmployeeStatus(employee.id, 'active')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredEmployees.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'No employees match the current filters'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;
