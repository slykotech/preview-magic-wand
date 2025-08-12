import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { NotificationService } from '@/services/notificationService';

const getPlatform = () => (Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');

async function getStableDeviceId() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { identifier } = await Device.getId();
      if (identifier) return identifier;
    }
  } catch {}
  // Fallback for web/dev
  const key = 'ls_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.getRandomValues(new Uint32Array(4)).join('-');
    localStorage.setItem(key, id);
  }
  return id;
}

export function usePushRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registered, setRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let notificationListener: any;

    async function register() {
      try {
        if (!user) return;
        if (!Capacitor.isNativePlatform()) {
          console.log('Not on native platform, skipping push registration');
          return;
        }

        const platform = Capacitor.getPlatform();
        console.log(`Starting push notification registration on ${platform}...`);

        // Check if notification support is available
        const isSupported = await NotificationService.checkNotificationSupport();
        if (!isSupported) {
          console.error('Notification support not available');
          toast({
            title: "Notifications Not Available",
            description: "Your device doesn't support push notifications.",
            variant: "destructive"
          });
          return;
        }

        // Request permissions using enhanced service
        const permissionGranted = await NotificationService.requestPermissions();
        setPermissionStatus(permissionGranted ? 'granted' : 'denied');

        if (!permissionGranted) {
          console.warn('Push permissions denied by user');
          toast({
            title: "Notifications Disabled",
            description: `Enable notifications in ${platform === 'ios' ? 'Settings > Notifications' : 'app settings'} to stay connected.`,
            variant: "destructive"
          });
          return;
        }

        // Get FCM token using enhanced service
        console.log('Getting FCM token...');
        const token = await NotificationService.getFCMToken();
        
        if (!token) {
          throw new Error('Failed to get FCM token');
        }
        
        tokenRef.current = token;

        const device_id = await getStableDeviceId();

        console.log('Registering device with backend...', { device_id, platform });

        // Register with backend
        const { error } = await supabase.from('push_subscriptions').upsert(
          { user_id: user.id, device_id, token, platform, is_active: true },
          { onConflict: 'user_id,device_id' }
        );

        if (error) {
          throw error;
        }

        // Setup notification listeners using enhanced service
        const cleanupListeners = NotificationService.setupNotificationListeners();

        // Listen for token refreshes
        const tokenListener = await FirebaseMessaging.addListener('tokenReceived', async (event: any) => {
          const newToken = event?.token;
          console.log('Token refresh received:', newToken ? 'Yes' : 'No');
          
          if (newToken && newToken !== tokenRef.current) {
            tokenRef.current = newToken;
            await supabase.from('push_subscriptions').upsert(
              { user_id: user.id, device_id, token: newToken, platform, is_active: true },
              { onConflict: 'user_id,device_id' }
            );
            console.log('Token updated in backend');
          }
        });

        unsub = () => {
          tokenListener.remove();
          cleanupListeners();
        };
        
        setRegistered(true);
        console.log(`Push notification registration completed successfully on ${platform}`);
        
        toast({
          title: "Notifications Enabled ✅",
          description: `You'll receive real-time updates on your ${platform === 'ios' ? 'iPhone' : 'Android'} device.`,
        });

      } catch (e) {
        console.error('Push registration failed:', e);
        setRegistered(false);
        setPermissionStatus('denied');
        
        const platform = Capacitor.getPlatform();
        toast({
          title: "Notification Setup Failed",
          description: `There was an issue setting up notifications on ${platform}. Check your ${platform === 'ios' ? 'iOS' : 'Android'} settings.`,
          variant: "destructive"
        });
      }
    }

    register();
    return () => { 
      if (unsub) unsub(); 
    };
  }, [user?.id, toast]);

  return { registered, permissionStatus };
}
