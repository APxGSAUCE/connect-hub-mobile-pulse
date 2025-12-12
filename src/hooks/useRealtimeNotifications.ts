import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface RealtimeNotificationHookProps {
  onNotificationReceived?: () => void;
}

export const useRealtimeNotifications = ({ onNotificationReceived }: RealtimeNotificationHookProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleNewNotification = useCallback(async (payload: any) => {
    const notification = payload.new;
    
    // Only show notifications for the current user
    if (notification.user_id !== user?.id) return;

    // Show browser push notification if app is not focused
    if (document.hidden || !document.hasFocus()) {
      await notificationService.showSystemNotification(
        notification.title,
        notification.message
      );
    } else {
      // Show in-app toast notification if app is focused
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    }

    // Trigger callback for UI updates
    onNotificationReceived?.();
  }, [user?.id, toast, onNotificationReceived]);

  const handleNewMessage = useCallback(async (payload: any) => {
    const message = payload.new;
    
    // Don't notify for own messages or if user is not logged in
    if (!user?.id || message.sender_id === user.id) return;

    try {
      // Check if user is member of the group
      const { data: membership, error: membershipError } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('group_id', message.group_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError || !membership) return;

      // Get sender info
      const { data: sender } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', message.sender_id)
        .maybeSingle();

      const senderName = sender 
        ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Someone'
        : 'Someone';

      // Show message notification
      await notificationService.showMessageNotification(senderName, message.content);

      // Create in-app notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: `💬 New message from ${senderName}`,
          message: message.content.length > 50 
            ? `${message.content.substring(0, 50)}...` 
            : message.content,
          type: 'message',
          related_id: message.id,
          related_type: 'message'
        });
    } catch (error) {
      console.error('Error handling new message notification:', error);
    }
  }, [user?.id]);

  const handleNewEvent = useCallback(async (payload: any) => {
    const event = payload.new;
    
    // Don't notify for own events or if user is not logged in
    if (!user?.id || event.created_by === user.id) return;

    try {
      const eventDate = new Date(event.start_date);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Show event notification
      await notificationService.showEventNotification(event.title, formattedDate);

      // Create in-app notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: `📅 New event: ${event.title}`,
          message: `Event scheduled for ${formattedDate}${event.location ? ` at ${event.location}` : ''}`,
          type: 'event',
          related_id: event.id,
          related_type: 'event'
        });
    } catch (error) {
      console.error('Error handling new event notification:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications with unique channel name
    const notificationChannel = supabase
      .channel(`realtime-notifications-${user.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, handleNewNotification)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, handleNewMessage)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, handleNewEvent)
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user, handleNewNotification, handleNewMessage, handleNewEvent]);

  return {
    isSupported: notificationService.isSupported(),
    hasPermission: notificationService.hasPermission(),
    requestPermission: notificationService.requestPermission.bind(notificationService)
  };
};