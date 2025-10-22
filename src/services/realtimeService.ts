
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<() => void>> = new Map();
  private channelStatus: Map<string, 'connecting' | 'connected' | 'disconnected'> = new Map();

  subscribe(channelName: string, callback: () => void) {
    // Add callback to subscribers
    if (!this.subscribers.has(channelName)) {
      this.subscribers.set(channelName, new Set());
    }
    this.subscribers.get(channelName)!.add(callback);

    // Create channel if it doesn't exist and is not connecting
    if (!this.channels.has(channelName) && this.channelStatus.get(channelName) !== 'connecting') {
      this.createChannel(channelName);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(channelName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.removeChannel(channelName);
        }
      }
    };
  }

  private createChannel(channelName: string) {
    this.channelStatus.set(channelName, 'connecting');
    let channel: RealtimeChannel;

    switch (channelName) {
      case 'messages':
        channel = supabase
          .channel(`messages-realtime-${Date.now()}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages'
          }, () => this.notifySubscribers(channelName))
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_groups'
          }, () => this.notifySubscribers(channelName))
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_group_members'
          }, () => this.notifySubscribers(channelName));
        break;

      case 'events':
        channel = supabase
          .channel(`events-realtime-${Date.now()}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'events'
          }, () => this.notifySubscribers(channelName))
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'event_participants'
          }, () => this.notifySubscribers(channelName));
        break;

      case 'profiles':
        channel = supabase
          .channel(`profiles-realtime-${Date.now()}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles'
          }, () => this.notifySubscribers(channelName));
        break;

      case 'notifications':
        channel = supabase
          .channel(`notifications-realtime-${Date.now()}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications'
          }, () => this.notifySubscribers(channelName));
        break;

      default:
        channel = supabase.channel(`${channelName}-${Date.now()}`);
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.channelStatus.set(channelName, 'connected');
      }
    });
    this.channels.set(channelName, channel);
  }

  private notifySubscribers(channelName: string) {
    const callbacks = this.subscribers.get(channelName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`Error in realtime callback for ${channelName}:`, error);
        }
      });
    }
  }

  private removeChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.subscribers.delete(channelName);
      this.channelStatus.set(channelName, 'disconnected');
    }
  }

  cleanup() {
    this.channels.forEach(channel => supabase.removeChannel(channel));
    this.channels.clear();
    this.subscribers.clear();
  }
}

export const realtimeService = new RealtimeService();
