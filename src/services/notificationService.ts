
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

  async showNotification(title: string, options?: NotificationOptions) {
    if (!this.permissionGranted) {
      await this.requestPermission();
    }
    
    if (this.permissionGranted) {
      const notificationOptions: NotificationOptions = {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        dir: 'auto',
        lang: 'en',
        silent: false,
        ...options
      };

      // Add vibrate only if supported and we're using service worker
      const enhancedOptions = this.registration && this.registration.active ? {
        ...notificationOptions,
        vibrate: [200, 100, 200]
      } : notificationOptions;

      try {
        if (this.registration && this.registration.active) {
          await this.registration.showNotification(title, enhancedOptions);
        } else {
          // Fallback to regular notification if service worker isn't available
          new Notification(title, notificationOptions);
        }
      } catch (error) {
        console.error('Error showing notification:', error);
        // Fallback to regular notification
        try {
          new Notification(title, notificationOptions);
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
        body: message,
        tag: 'message',
        requireInteraction: false,
        data: {
          type: 'message',
          sender: senderName,
          timestamp: Date.now()
        }
      });
    }
  }

  async showEventNotification(eventTitle: string, startTime: string) {
    await this.showNotification(`📅 Upcoming Event`, {
      body: `${eventTitle} - Starting at ${startTime}`,
      tag: 'event',
      requireInteraction: false,
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
      data: {
        type: 'system',
        timestamp: Date.now()
      }
    });
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
