import { useState, useEffect, useCallback } from "react";
import { Bell, X, Check, MessageSquare, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { notificationService } from "@/services/notificationService";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  related_type?: string;
}

interface NotificationCenterProps {
  unreadCount: number;
  onCountChange: (count: number) => void;
}

export const NotificationCenter = ({ unreadCount, onCountChange }: NotificationCenterProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      const unread = (data || []).filter(n => !n.is_read).length;
      onCountChange(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, onCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notification updates
  useRealtimeSubscription('notifications', useCallback(() => {
    fetchNotifications();
    // Show browser notification for new notifications when app is not focused
    if (document.hidden || !document.hasFocus()) {
      notificationService.showSystemNotification(
        'New Notification',
        'You have a new notification in One Ilocos Sur Portal'
      );
    }
  }, [fetchNotifications]), [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      
      const newUnreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length;
      onCountChange(newUnreadCount);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onCountChange(0);

      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'event': return <Calendar className="w-4 h-4 text-green-600" />;
      case 'system': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-50 border-blue-200';
      case 'event': return 'bg-green-50 border-green-200';
      case 'system': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-1.5 sm:p-2 touch-manipulation">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 p-0 flex items-center justify-center text-xs animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:w-96 max-w-full flex flex-col p-4 sm:p-6" side="right">
        <SheetHeader className="pb-4 pr-8">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount}</Badge>
              )}
            </SheetTitle>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs mt-2 w-fit"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see updates from your team here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`relative transition-all duration-200 hover:shadow-md ${
                    notification.is_read 
                      ? 'bg-background border-border opacity-75' 
                      : getNotificationBgColor(notification.type)
                  }`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                          <h4 className={`text-xs sm:text-sm font-medium leading-4 sm:leading-5 break-words ${
                            notification.is_read ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 h-6 w-6 hover:bg-background/50 flex-shrink-0 touch-manipulation"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        
                        <p className={`text-xs mt-1 leading-4 break-words ${
                          notification.is_read ? 'text-muted-foreground' : 'text-foreground/80'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {!notification.is_read && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};