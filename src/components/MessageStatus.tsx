
import { Check, CheckCheck, Clock } from "lucide-react";

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  timestamp: string;
}

const MessageStatus = ({ status, timestamp }: MessageStatusProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center space-x-1 text-xs">
      {getStatusIcon()}
      <span className="text-xs opacity-75">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
      <span className="text-xs opacity-60">• {getStatusText()}</span>
    </div>
  );
};

export default MessageStatus;
