import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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

        console.log('Starting push notification registration...');

        // Check permissions first
        const perm = await FirebaseMessaging.checkPermissions();
        console.log('Current permissions:', perm);
        setPermissionStatus(perm.receive === 'granted' ? 'granted' : 'denied');

        if (perm.receive !== 'granted') {
          console.log('Requesting push permissions...');
          const req = await FirebaseMessaging.requestPermissions();
          console.log('Permission request result:', req);
          
          setPermissionStatus(req.receive === 'granted' ? 'granted' : 'denied');
          
          if (req.receive !== 'granted') {
            console.warn('Push permissions denied by user');
            toast({
              title: "Notifications Disabled",
              description: "You won't receive push notifications. Enable them in app settings to stay connected.",
              variant: "destructive"
            });
            return;
          }
        }

        // Get FCM token
        console.log('Getting FCM token...');
        const { token } = await FirebaseMessaging.getToken();
        console.log('FCM Token received:', token ? 'Yes' : 'No');
        
        if (!token) {
          throw new Error('Failed to get FCM token');
        }
        
        tokenRef.current = token;

        const device_id = await getStableDeviceId();
        const platform = getPlatform();

        console.log('Registering device with backend...', { device_id, platform });

        // Register with backend
        const { error } = await supabase.from('push_subscriptions').upsert(
          { user_id: user.id, device_id, token, platform, is_active: true },
          { onConflict: 'user_id,device_id' }
        );

        if (error) {
          throw error;
        }

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

        // Listen for notification received events
        notificationListener = await FirebaseMessaging.addListener('notificationReceived', (event: any) => {
          console.log('Notification received:', event);
        });

        // Listen for notification action performed
        const actionListener = await FirebaseMessaging.addListener('notificationActionPerformed', (event: any) => {
          console.log('Notification action performed:', event);
        });

        unsub = () => {
          tokenListener.remove();
          notificationListener.remove();
          actionListener.remove();
        };
        
        setRegistered(true);
        console.log('Push notification registration completed successfully');
        
        toast({
          title: "Notifications Enabled ✅",
          description: "You'll receive real-time updates from your partner.",
        });

      } catch (e) {
        console.error('Push registration failed:', e);
        setRegistered(false);
        setPermissionStatus('denied');
        
        toast({
          title: "Notification Setup Failed",
          description: "There was an issue setting up push notifications. Some features may not work properly.",
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
