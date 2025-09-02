import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface MessageDeleteButtonProps {
  messageId: string;
  senderId: string;
  currentUserId: string;
  onDelete: () => void;
}

export const MessageDeleteButton = ({ 
  messageId, 
  senderId, 
  currentUserId, 
  onDelete 
}: MessageDeleteButtonProps) => {
  const { toast } = useToast();
  const { userRole } = useUserRole();
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user can delete message
  const canDelete = 
    senderId === currentUserId || // Own message
    userRole?.can_manage_users || // Admin/Super admin
    userRole?.is_department_head; // Department head

  if (!canDelete) return null;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message deleted successfully",
      });

      onDelete();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="w-3 h-3" />
    </Button>
  );
};