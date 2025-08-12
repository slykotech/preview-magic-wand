import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('Not on native platform, skipping notification permission request');
        return false;
      }

      // Check current permissions
      const currentPermissions = await FirebaseMessaging.checkPermissions();
      console.log('Current notification permissions:', currentPermissions);

      if (currentPermissions.receive === 'granted') {
        return true;
      }

      // Request permissions if not granted
      const requestResult = await FirebaseMessaging.requestPermissions();
      console.log('Permission request result:', requestResult);

      return requestResult.receive === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async getFCMToken(): Promise<string | null> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return null;
      }

      const { token } = await FirebaseMessaging.getToken();
      console.log('FCM Token obtained:', token ? 'Yes' : 'No');
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  static setupNotificationListeners() {
    if (!Capacitor.isNativePlatform()) {
      return () => {};
    }

    const listeners: any[] = [];

    // Listen for notification received while app is in foreground
    FirebaseMessaging.addListener('notificationReceived', (notification) => {
      console.log('Notification received in foreground:', notification);
      // Handle foreground notification display
    }).then(listener => listeners.push(listener));

    // Listen for notification tap/action
    FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
      console.log('Notification action performed:', action);
      // Handle notification tap navigation
    }).then(listener => listeners.push(listener));

    // Listen for token refresh
    FirebaseMessaging.addListener('tokenReceived', (data) => {
      console.log('FCM token refreshed:', data.token);
      // Handle token refresh - update backend
    }).then(listener => listeners.push(listener));

    // Return cleanup function
    return () => {
      listeners.forEach(listener => listener.remove());
    };
  }
}