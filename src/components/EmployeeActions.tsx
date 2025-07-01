
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Volume2, Ban, CheckCircle } from "lucide-react";

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

interface EmployeeActionsProps {
  employee: Employee;
  onStatusUpdate: (employeeId: string, status: Employee['status']) => void;
}

export const EmployeeActions = ({ employee, onStatusUpdate }: EmployeeActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onStatusUpdate(employee.id, 'muted')}
          disabled={employee.status === 'muted'}
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Mute
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onStatusUpdate(employee.id, 'blocked')}
          disabled={employee.status === 'blocked'}
        >
          <Ban className="w-4 h-4 mr-2" />
          Block
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onStatusUpdate(employee.id, 'active')}
          disabled={employee.status === 'active'}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Activate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
