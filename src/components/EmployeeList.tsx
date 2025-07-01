
import { Users } from "lucide-react";
import { EmployeeCard } from "./EmployeeCard";

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

interface EmployeeListProps {
  employees: Employee[];
  isAdmin: boolean;
  onDirectMessage: (employeeId: string, employeeName: string) => void;
  onStatusUpdate: (employeeId: string, status: Employee['status']) => void;
}

export const EmployeeList = ({ 
  employees, 
  isAdmin, 
  onDirectMessage, 
  onStatusUpdate 
}: EmployeeListProps) => {
  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
        <p className="text-gray-600">
          There are no employees matching your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          isAdmin={isAdmin}
          onDirectMessage={onDirectMessage}
          onStatusUpdate={onStatusUpdate}
        />
      ))}
    </div>
  );
};
