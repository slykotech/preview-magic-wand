import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  const [registered, setRegistered] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    async function register() {
      try {
        if (!user) return;
        if (!Capacitor.isNativePlatform()) return; // mobile only

        // Permissions
        const perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive !== 'granted') {
          const req = await FirebaseMessaging.requestPermissions();
          if (req.receive !== 'granted') return;
        }

        const { token } = await FirebaseMessaging.getToken();
        tokenRef.current = token;

        const device_id = await getStableDeviceId();
        const platform = getPlatform();

        await supabase.from('push_subscriptions').upsert(
          { user_id: user.id, device_id, token, platform, is_active: true },
          { onConflict: 'user_id,device_id' }
        );

        // Listen for token refreshes
        const tokenListener = await FirebaseMessaging.addListener('tokenReceived', async (event: any) => {
          const newToken = event?.token;
          if (newToken && newToken !== tokenRef.current) {
            tokenRef.current = newToken;
            await supabase.from('push_subscriptions').upsert(
              { user_id: user.id, device_id, token: newToken, platform, is_active: true },
              { onConflict: 'user_id,device_id' }
            );
          }
        });

        unsub = () => tokenListener.remove();
        setRegistered(true);
      } catch (e) {
        console.warn('Push registration failed', e);
        setRegistered(false);
      }
    }

    register();
    return () => { if (unsub) unsub(); };
  }, [user?.id]);

  return { registered };
}
