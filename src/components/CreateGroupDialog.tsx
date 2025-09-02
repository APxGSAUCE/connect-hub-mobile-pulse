import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  departments: Department[];
  onGroupCreated: () => void;
}

export const CreateGroupDialog = ({
  isOpen,
  onClose,
  employees,
  departments,
  onGroupCreated
}: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleDepartmentSelect = (departmentId: string) => {
    if (departmentId === selectedDepartment) {
      setSelectedDepartment("");
      setSelectedMembers([]);
    } else {
      setSelectedDepartment(departmentId);
      // Auto-select all employees from this department
      const departmentEmployees = employees
        .filter(emp => emp.department_id === departmentId)
        .map(emp => emp.id);
      setSelectedMembers(departmentEmployees);
    }
  };

  const getEmployeeName = (employee: Employee) => {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      });
      return;
    }

    if (selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one member",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);

      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          group_type: 'group',
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const memberData = [
        {
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin'
        },
        // Add selected members as regular members
        ...selectedMembers.map(memberId => ({
          group_id: groupData.id,
          user_id: memberId,
          role: 'member'
        }))
      ];

      const { error: memberError } = await supabase
        .from('chat_group_members')
        .insert(memberData);

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Group chat created successfully!",
      });

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
      setSelectedDepartment("");
      onClose();
      onGroupCreated();

    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group chat",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredEmployees = employees.filter(emp => emp.id !== user?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Create Group Chat</span>
          </DialogTitle>
          <DialogDescription>
            Create a new group conversation with multiple team members
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description (Optional)</Label>
            <Input
              id="groupDescription"
              placeholder="Enter group description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
          </div>

          {/* Department Quick Select */}
          <div className="space-y-2">
            <Label>Quick Select by Department</Label>
            <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department (optional)" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <Label>Select Members * ({selectedMembers.length} selected)</Label>
            <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={selectedMembers.includes(employee.id)}
                      onCheckedChange={() => handleMemberToggle(employee.id)}
                    />
                    <Label htmlFor={employee.id} className="text-sm cursor-pointer flex-1">
                      {getEmployeeName(employee)}
                      {employee.position && ` - ${employee.position}`}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No employees available
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
            >
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};