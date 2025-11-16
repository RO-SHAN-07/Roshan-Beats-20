class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = 'BKxQzQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8'; // Placeholder VAPID key
  }

  async init() {
    // Check if Capacitor Push Notifications is available (Android)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
      const { PushNotifications } = window.Capacitor.Plugins;

      // Request permission
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }
      });

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', token => {
        console.log('Push registration success, token: ' + token.value);
        this.subscription = { token: token.value };
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', err => {
        console.error('Registration error: ', err.error);
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('Push received: ', notification);
        this.handleNotification(notification);
      });

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('Push action performed: ', notification);
        this.handleNotificationAction(notification);
      });

      console.log('Capacitor Push notifications initialized');
    } else if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Fallback to web push API
      try {
        this.registration = await navigator.serviceWorker.ready;
        this.subscription = await this.registration.pushManager.getSubscription();
        console.log('Web Push notifications initialized');
      } catch (error) {
        console.error('Failed to initialize web push notifications:', error);
      }
    }
  }

  async requestPermission() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
      // Capacitor handles permissions in init
      return 'granted';
    } else {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      return permission;
    }
  }

  async subscribe() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
      // Capacitor handles subscription in init
      return this.subscription;
    } else {
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
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      this.subscription = subscription;

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    }
  }

  async unsubscribe() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
      // For Capacitor, unregister
      const { PushNotifications } = window.Capacitor.Plugins;
      await PushNotifications.unregister();
      this.subscription = null;
    } else {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
        await this.removeSubscriptionFromServer();
      }
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
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
        body: JSON.stringify(this.subscription),
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  isSubscribed() {
    return !!this.subscription;
  }

  getPermissionStatus() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
      // Capacitor doesn't expose permission status directly
      return this.subscription ? 'granted' : 'default';
    } else {
      return Notification.permission;
    }
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

  handleNotification(notification) {
    // Handle incoming notification
    console.log('Handling notification:', notification);
    // You can show a custom UI or perform actions here
    if (notification.data && notification.data.url) {
      // Could navigate to a specific page
    }
  }

  handleNotificationAction(notification) {
    // Handle notification tap
    console.log('Handling notification action:', notification);
    if (notification.notification && notification.notification.data && notification.notification.data.url) {
      window.location.href = notification.notification.data.url;
    }
  }

  async sendTestNotification() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
      // For Capacitor, test notifications are sent from FCM console or server
      console.log('For Capacitor, send test notifications via FCM');
      alert('Test notifications for Capacitor apps are sent via FCM console or backend server.');
    } else {
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
            url: '/',
          }),
        });
      } catch (error) {
        console.error('Failed to send test notification:', error);
      }
    }
  }
}

export default new PushNotificationManager();
