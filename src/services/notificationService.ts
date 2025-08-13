
class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permissionGranted: boolean = false;

  async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        
        console.log('Service Worker registered successfully');
        
        // Check current permission status
        this.permissionGranted = Notification.permission === 'granted';
        
        // Listen for service worker updates
        this.registration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New Service Worker installed');
              }
            });
          }
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
        return true;
      }
      
      if (Notification.permission === 'denied') {
        console.warn('Notification permission denied');
        return false;
      }
      
      try {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
        
        if (this.permissionGranted) {
          console.log('Notification permission granted');
        } else {
          console.warn('Notification permission denied by user');
        }
        
        return this.permissionGranted;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  }

  async showNotification(title: string, options?: any) {
    if (!this.permissionGranted) {
      await this.requestPermission();
    }
    
    if (this.permissionGranted) {
      const baseOptions: NotificationOptions = {
        icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png',
        badge: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png',
        dir: 'auto',
        lang: 'en',
        silent: false,
        body: options?.body,
        tag: options?.tag || 'default',
        requireInteraction: options?.requireInteraction || false,
        data: {
          ...options?.data,
          timestamp: Date.now(),
          url: window.location.origin,
          clickUrl: options?.clickUrl || window.location.origin
        }
      };

      try {
        if (this.registration && this.registration.active) {
          // Use service worker notifications for enhanced features
          const swOptions = {
            ...baseOptions,
            vibrate: options?.vibrate || [200, 100, 200],
            actions: options?.actions || [],
            image: options?.image,
            renotify: true,
            ...options
          };
          await this.registration.showNotification(title, swOptions);
        } else {
          // Fallback to regular notification if service worker isn't available
          const notification = new Notification(title, baseOptions);
          
          // Add click handler for fallback notifications
          notification.onclick = () => {
            window.focus();
            if (options?.clickUrl) {
              window.location.href = options.clickUrl;
            }
            notification.close();
          };
        }
      } catch (error) {
        console.error('Error showing notification:', error);
        // Fallback to regular notification
        try {
          const notification = new Notification(title, baseOptions);
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (fallbackError) {
          console.error('Fallback notification also failed:', fallbackError);
        }
      }
    }
  }

  async showMessageNotification(senderName: string, message: string) {
    // Only show notification if app is not in focus
    if (document.hidden || !document.hasFocus()) {
      await this.showNotification(`💬 ${senderName}`, {
        body: message.length > 100 ? `${message.substring(0, 100)}...` : message,
        tag: 'message',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          {
            action: 'reply',
            title: '💬 Reply',
            icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png'
          },
          {
            action: 'view',
            title: '👀 View',
            icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png'
          }
        ],
        clickUrl: '/?tab=messages',
        data: {
          type: 'message',
          sender: senderName,
          messageContent: message,
          timestamp: Date.now()
        }
      });
    }
  }

  async showEventNotification(eventTitle: string, startTime: string) {
    await this.showNotification(`📅 ${eventTitle}`, {
      body: `Starting at ${startTime}`,
      tag: 'event',
      requireInteraction: true,
      vibrate: [300, 100, 300],
      actions: [
        {
          action: 'view-event',
          title: '📅 View Event',
          icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png'
        },
        {
          action: 'remind-later',
          title: '⏰ Remind Later',
          icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png'
        }
      ],
      clickUrl: '/?tab=events',
      data: {
        type: 'event',
        title: eventTitle,
        startTime: startTime,
        timestamp: Date.now()
      }
    });
  }

  async showSystemNotification(title: string, message: string) {
    await this.showNotification(`🔔 ${title}`, {
      body: message,
      tag: 'system',
      requireInteraction: false,
      vibrate: [100, 50, 100],
      actions: [
        {
          action: 'view',
          title: '👀 View',
          icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png'
        },
        {
          action: 'dismiss',
          title: '✕ Dismiss',
          icon: '/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png'
        }
      ],
      clickUrl: '/',
      data: {
        type: 'system',
        title: title,
        message: message,
        timestamp: Date.now()
      }
    });
  }

  // Method to show notification permission prompt with better UX
  async showPermissionPrompt(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (this.hasPermission()) {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notifications are blocked. User needs to enable them manually in browser settings.');
      return false;
    }

    try {
      const permission = await this.requestPermission();
      if (permission) {
        // Show a welcome notification
        await this.showSystemNotification(
          'Notifications Enabled!',
          'You will now receive real-time updates from One Ilocos Sur Portal'
        );
      }
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Check if notifications are supported and permission is granted
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  hasPermission(): boolean {
    return this.permissionGranted;
  }

  // Get permission status
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const notificationService = new NotificationService();
