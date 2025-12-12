
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<() => void>> = new Map();
  private channelStatus: Map<string, 'connecting' | 'connected' | 'disconnected' | 'error'> = new Map();
  private retryCount: Map<string, number> = new Map();
  private maxRetries = 3;

  subscribe(channelName: string, callback: () => void) {
    // Add callback to subscribers
    if (!this.subscribers.has(channelName)) {
      this.subscribers.set(channelName, new Set());
    }
    this.subscribers.get(channelName)!.add(callback);

    // Create channel if it doesn't exist and is not connecting
    const status = this.channelStatus.get(channelName);
    if (!this.channels.has(channelName) && status !== 'connecting') {
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
    this.retryCount.set(channelName, 0);
    
    let channel: RealtimeChannel;
    const uniqueId = `${channelName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    switch (channelName) {
      case 'messages':
        channel = supabase
          .channel(uniqueId)
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
          .channel(uniqueId)
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
          .channel(uniqueId)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles'
          }, () => this.notifySubscribers(channelName));
        break;

      case 'notifications':
        channel = supabase
          .channel(uniqueId)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications'
          }, () => this.notifySubscribers(channelName));
        break;

      case 'departments':
        channel = supabase
          .channel(uniqueId)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'departments'
          }, () => this.notifySubscribers(channelName));
        break;

      default:
        channel = supabase.channel(uniqueId);
    }

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        this.channelStatus.set(channelName, 'connected');
        this.retryCount.set(channelName, 0);
        console.log(`Realtime channel ${channelName} connected`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.channelStatus.set(channelName, 'error');
        console.error(`Realtime channel ${channelName} error:`, err);
        this.handleChannelError(channelName);
      } else if (status === 'CLOSED') {
        this.channelStatus.set(channelName, 'disconnected');
      }
    });
    
    this.channels.set(channelName, channel);
  }

  private handleChannelError(channelName: string) {
    const currentRetries = this.retryCount.get(channelName) || 0;
    
    if (currentRetries < this.maxRetries) {
      this.retryCount.set(channelName, currentRetries + 1);
      console.log(`Retrying channel ${channelName} (attempt ${currentRetries + 1}/${this.maxRetries})`);
      
      // Remove the failed channel
      this.removeChannel(channelName);
      
      // Retry after a delay
      setTimeout(() => {
        if (this.subscribers.has(channelName) && this.subscribers.get(channelName)!.size > 0) {
          this.createChannel(channelName);
        }
      }, Math.pow(2, currentRetries) * 1000); // Exponential backoff
    } else {
      console.error(`Max retries reached for channel ${channelName}`);
    }
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
      this.channelStatus.set(channelName, 'disconnected');
    }
  }

  getChannelStatus(channelName: string): string {
    return this.channelStatus.get(channelName) || 'disconnected';
  }

  cleanup() {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
      console.log(`Cleaned up channel ${name}`);
    });
    this.channels.clear();
    this.subscribers.clear();
    this.channelStatus.clear();
    this.retryCount.clear();
  }
}

export const realtimeService = new RealtimeService();
