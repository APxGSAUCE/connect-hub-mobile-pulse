import { Badge } from "@/components/ui/badge";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MessageStatus = ({ 
  status, 
  className, 
  showText = false, 
  size = 'sm' 
}: MessageStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'sending':
        return {
          icon: <Clock className={cn("w-3 h-3", size === 'md' && "w-4 h-4", size === 'lg' && "w-5 h-5")} />,
          text: 'Sending',
          variant: 'secondary' as const,
          color: 'text-gray-500'
        };
      case 'sent':
        return {
          icon: <Check className={cn("w-3 h-3", size === 'md' && "w-4 h-4", size === 'lg' && "w-5 h-5")} />,
          text: 'Sent',
          variant: 'secondary' as const,
          color: 'text-gray-500'
        };
      case 'delivered':
        return {
          icon: <CheckCheck className={cn("w-3 h-3", size === 'md' && "w-4 h-4", size === 'lg' && "w-5 h-5")} />,
          text: 'Delivered',
          variant: 'outline' as const,
          color: 'text-blue-500'
        };
      case 'read':
        return {
          icon: <CheckCheck className={cn("w-3 h-3", size === 'md' && "w-4 h-4", size === 'lg' && "w-5 h-5")} />,
          text: 'Read',
          variant: 'default' as const,
          color: 'text-green-500'
        };
      case 'failed':
        return {
          icon: <AlertCircle className={cn("w-3 h-3", size === 'md' && "w-4 h-4", size === 'lg' && "w-5 h-5")} />,
          text: 'Failed',
          variant: 'destructive' as const,
          color: 'text-red-500'
        };
      default:
        return {
          icon: <Clock className={cn("w-3 h-3", size === 'md' && "w-4 h-4", size === 'lg' && "w-5 h-5")} />,
          text: 'Unknown',
          variant: 'secondary' as const,
          color: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  if (showText) {
    return (
      <Badge 
        variant={config.variant} 
        className={cn("flex items-center gap-1", config.color, className)}
      >
        {config.icon}
        <span className="text-xs">{config.text}</span>
      </Badge>
    );
  }

  return (
    <div className={cn("flex items-center", config.color, className)}>
      {config.icon}
    </div>
  );
};