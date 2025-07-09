
class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async showNotification(title: string, options?: NotificationOptions) {
    if (await this.requestPermission()) {
      if (this.registration) {
        await this.registration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options
        });
      } else {
        new Notification(title, options);
      }
    }
  }

  async showMessageNotification(senderName: string, message: string) {
    await this.showNotification(`New message from ${senderName}`, {
      body: message,
      tag: 'message',
      requireInteraction: true,
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View' }
      ]
    });
  }

  async showEventNotification(eventTitle: string, startTime: string) {
    await this.showNotification(`Upcoming Event: ${eventTitle}`, {
      body: `Starting at ${startTime}`,
      tag: 'event',
      requireInteraction: true
    });
  }
}

export const notificationService = new NotificationService();
