class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = 'BKxQzQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8'; // Placeholder VAPID key
  }

  async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        this.subscription = await this.registration.pushManager.getSubscription();
        console.log('Push notifications initialized');
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    return permission;
  }

  async subscribe() {
    if (!this.registration) {
      throw new Error('Service worker not ready');
    }

    try {
      const response = await fetch('/api/vapid-key'); // Get VAPID key from server
      const { publicKey } = await response.json();
      this.vapidPublicKey = publicKey;
    } catch (error) {
      console.warn('Using default VAPID key');
    }

    const subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
    });

    this.subscription = subscription;

    // Send subscription to server
    await this.sendSubscriptionToServer(subscription);

    return subscription;
  }

  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
      await this.removeSubscriptionFromServer();
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  async removeSubscriptionFromServer() {
    try {
      await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.subscription)
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  isSubscribed() {
    return !!this.subscription;
  }

  getPermissionStatus() {
    return Notification.permission;
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async sendTestNotification() {
    if (!this.subscription) {
      throw new Error('Not subscribed to push notifications');
    }

    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription,
          title: 'Test Notification',
          body: 'This is a test push notification from Roshan Beats!',
          url: '/'
        })
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }
}

export default new PushNotificationManager();