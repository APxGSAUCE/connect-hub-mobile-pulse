
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'muted' | 'blocked' | 'inactive';
  department?: {
    name: string;
  };
}

interface DirectMessageProps {
  onOpenChat: (groupId: string) => void;
}

const DirectMessage = ({ onOpenChat }: DirectMessageProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          status,
          department:departments (
            name
          )
        `)
        .eq('status', 'active')
        .neq('id', user?.id)
        .order('first_name');

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

  const startDirectMessage = async (employeeId: string, employeeName: string) => {
    try {
      const { data, error } = await supabase.rpc('create_direct_message_group', {
        other_user_id: employeeId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Chat with ${employeeName} started.`,
      });

      // Open the chat
      onOpenChat(data);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading employees...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Direct Messages</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employees.map((employee) => (
            <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getInitials(employee.first_name, employee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {employee.first_name} {employee.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{employee.email}</p>
                  {employee.department && (
                    <p className="text-xs text-blue-600">{employee.department.name}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => startDirectMessage(employee.id, `${employee.first_name} ${employee.last_name}`)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Chat
              </Button>
            </div>
          ))}
          {employees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No employees available for messaging</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectMessage;
