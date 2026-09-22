
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { EmployeeActions } from "./EmployeeActions";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  status: 'active' | 'muted' | 'blocked' | 'inactive';
  department_id: string | null;
  avatar_url?: string | null;
}

interface EmployeeCardProps {
  employee: Employee;
  isAdmin: boolean;
  onDirectMessage: (employeeId: string, employeeName: string) => void;
  onStatusUpdate: (employeeId: string, status: Employee['status']) => void;
}

export const EmployeeCard = ({ 
  employee, 
  isAdmin, 
  onDirectMessage, 
  onStatusUpdate 
}: EmployeeCardProps) => {
  const resolvedAvatarUrl = useSignedUrl(employee.avatar_url);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Card id={`employee-${employee.id}`} className="hover:shadow-md transition-shadow target:ring-2 target:ring-ring">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              {resolvedAvatarUrl && <AvatarImage src={resolvedAvatarUrl} alt={`${employee.first_name} ${employee.last_name}`} />}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-lg">
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
              onClick={() => onDirectMessage(employee.id, `${employee.first_name} ${employee.last_name}`)}
              aria-label={`Message ${employee.first_name} ${employee.last_name}`}
              className="min-h-11 min-w-11"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            {isAdmin && (
              <EmployeeActions
                employee={employee}
                onStatusUpdate={onStatusUpdate}
              />
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
                employee.status === 'active' ? 'bg-secondary text-secondary-foreground' :
                employee.status === 'muted' ? 'bg-muted text-foreground' :
                employee.status === 'blocked' ? 'bg-destructive text-destructive-foreground' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {employee.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
