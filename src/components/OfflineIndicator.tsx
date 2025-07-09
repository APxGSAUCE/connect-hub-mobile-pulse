
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOfflineMessage) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="bg-destructive/90 text-destructive-foreground border-destructive">
        <div className="flex items-center space-x-2 p-3">
          <WifiOff className="w-4 h-4" />
          <div className="flex-1">
            <p className="text-sm font-medium">You're offline</p>
            <p className="text-xs opacity-90">Some features may not be available</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OfflineIndicator;
