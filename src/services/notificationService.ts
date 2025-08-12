import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('Not on native platform, skipping notification permission request');
        return false;
      }

      const platform = Capacitor.getPlatform();
      console.log(`Requesting notifications on ${platform}`);

      // Check current permissions
      const currentPermissions = await FirebaseMessaging.checkPermissions();
      console.log('Current notification permissions:', currentPermissions);

      if (currentPermissions.receive === 'granted') {
        console.log('Notifications already granted');
        return true;
      }

      // Request permissions if not granted
      const requestResult = await FirebaseMessaging.requestPermissions();
      console.log('Permission request result:', requestResult);

      const granted = requestResult.receive === 'granted';
      
      if (granted) {
        console.log(`Notifications granted on ${platform}`);
        
        // iOS-specific: Register for remote notifications
        if (platform === 'ios') {
          console.log('Registering for remote notifications on iOS');
          await this.registerForRemoteNotifications();
        }
      } else {
        console.warn(`Notifications denied on ${platform}`);
      }

      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async registerForRemoteNotifications(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'ios') {
        // On iOS, we need to ensure the app is registered for remote notifications
        const { token } = await FirebaseMessaging.getToken();
        if (token) {
          console.log('iOS remote notification registration successful');
        }
      }
    } catch (error) {
      console.error('Error registering for remote notifications:', error);
    }
  }

  static async getFCMToken(): Promise<string | null> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return null;
      }

      console.log('Getting FCM token...');
      const { token } = await FirebaseMessaging.getToken();
      console.log('FCM Token obtained:', token ? 'Yes' : 'No');
      
      if (!token) {
        console.warn('No FCM token received');
      }
      
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  static setupNotificationListeners() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not on native platform, skipping notification listeners');
      return () => {};
    }

    const platform = Capacitor.getPlatform();
    console.log(`Setting up notification listeners for ${platform}`);
    const listeners: any[] = [];

    // Listen for notification received while app is in foreground
    FirebaseMessaging.addListener('notificationReceived', (notification) => {
      console.log('Notification received in foreground:', notification);
      
      // iOS: Show custom notification UI if needed
      if (platform === 'ios') {
        console.log('Handling foreground notification on iOS');
      }
    }).then(listener => listeners.push(listener));

    // Listen for notification tap/action
    FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
      console.log('Notification action performed:', action);
      
      // Handle notification tap navigation
      // You can add navigation logic here based on notification data
    }).then(listener => listeners.push(listener));

    // Listen for token refresh
    FirebaseMessaging.addListener('tokenReceived', (data) => {
      console.log('FCM token refreshed:', data.token);
      // Handle token refresh - update backend
      // This is especially important on iOS where tokens can change
    }).then(listener => listeners.push(listener));

    console.log(`Notification listeners setup complete for ${platform}`);

    // Return cleanup function
    return () => {
      console.log('Cleaning up notification listeners');
      listeners.forEach(listener => listener.remove());
    };
  }

  static async checkNotificationSupport(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      // Test if Firebase Messaging is available
      await FirebaseMessaging.checkPermissions();
      return true;
    } catch (error) {
      console.error('Firebase Messaging not available:', error);
      return false;
    }
  }
}