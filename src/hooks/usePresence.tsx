import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceState {
  user_id: string;
  device_id: string;
  online_at: string;
}

export const usePresence = (coupleId?: string) => {
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const { user } = useAuth();
  const notifiedOnlineRef = useRef(false);
  const deviceIdRef = useRef<string>();

  // Generate a unique device ID for this session
  if (!deviceIdRef.current) {
    deviceIdRef.current = `${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    // Only track presence when we have a couple ID
    if (!coupleId) {
      setIsUserOnline(false);
      setIsPartnerOnline(false);
      return;
    }

    const channel = supabase.channel(`couple_presence_${coupleId}`);

    // Track user's presence with unique device ID
    const userStatus: PresenceState = {
      user_id: user.id,
      device_id: deviceIdRef.current,
      online_at: new Date().toISOString(),
    };

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        console.log('Presence sync:', newState);
        
        // Check if current user is online (from any device)
        const userPresent = Object.values(newState).some((presences: any) =>
          presences.some((presence: any) => presence.user_id === user.id)
        );
        setIsUserOnline(userPresent);

        // Check if partner is online (any other user in the couple channel, from any device)
        const partnerPresent = Object.values(newState).some((presences: any) =>
          presences.some((presence: any) => presence.user_id !== user.id)
        );
        setIsPartnerOnline(partnerPresent);
        console.log('User online:', userPresent, 'Partner online:', partnerPresent);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
        // Check if any of the new presences is a partner (not current user)
        const hasPartnerJoined = newPresences.some((presence: any) => presence.user_id !== user.id);
        if (hasPartnerJoined) {
          setIsPartnerOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        // Only set partner offline if no other partner devices are present
        const leftUserIds = leftPresences.map((p: any) => p.user_id);
        const hasPartnerLeft = leftUserIds.some((id: string) => id !== user.id);
        
        if (hasPartnerLeft) {
          // Check if partner still has other devices online
          const currentState = channel.presenceState();
          const partnerStillPresent = Object.values(currentState).some((presences: any) =>
            presences.some((presence: any) => presence.user_id !== user.id)
          );
          setIsPartnerOnline(partnerStillPresent);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the current user's presence
          await channel.track(userStatus);
          setIsUserOnline(true);

          // Notify partner once when coming online
          if (!notifiedOnlineRef.current) {
            notifiedOnlineRef.current = true;
            try {
              if (coupleId) {
                const { data: couple } = await supabase
                  .from('couples')
                  .select('user1_id, user2_id')
                  .eq('id', coupleId)
                  .single();
                const partnerId = couple ? (couple.user1_id === user.id ? couple.user2_id : couple.user1_id) : null;
                if (partnerId) {
                  await supabase.functions.invoke('send-push', {
                    body: {
                      target_user_id: partnerId,
                      title: 'Partner is online',
                      body: 'Your partner just came online',
                      data: { route: '/dashboard' }
                    }
                  });
                }
              }
            } catch (e) {
              console.warn('send-push partner-online failed (non-blocking):', e);
            }
          }
        }
      });

    // Update presence periodically (heartbeat)
    const heartbeat = setInterval(async () => {
      try {
        await channel.track({
          user_id: user.id,
          device_id: deviceIdRef.current,
          online_at: new Date().toISOString(),
        });
      } catch (error) {
        console.log('Heartbeat update failed:', error);
      }
    }, 30000); // Update every 30 seconds

    // Handle tab visibility changes
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await channel.track({
          user_id: user.id,
          device_id: deviceIdRef.current,
          online_at: new Date().toISOString(),
        });
        setIsUserOnline(true);
      } else {
        // Keep presence active even when tab is hidden
        // Users remain online across multiple devices/tabs
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
      setIsUserOnline(false);
      setIsPartnerOnline(false);
      notifiedOnlineRef.current = false;
    };
  }, [coupleId, user]);

  return {
    isUserOnline,
    isPartnerOnline,
  };
};
