import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceState {
  user_id: string;
  online_at: string;
}

export const usePresence = (coupleId?: string) => {
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const { user } = useAuth();

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

    // Track user's presence
    const userStatus: PresenceState = {
      user_id: user.id,
      online_at: new Date().toISOString(),
    };

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        
        // Check if current user is online
        const userPresent = Object.values(newState).some((presences: any) =>
          presences.some((presence: any) => presence.user_id === user.id)
        );
        setIsUserOnline(userPresent);

        // Check if partner is online (any other user in the couple channel)
        const partnerPresent = Object.values(newState).some((presences: any) =>
          presences.some((presence: any) => presence.user_id !== user.id)
        );
        setIsPartnerOnline(partnerPresent);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const joinedUser = newPresences[0];
        if (joinedUser.user_id !== user.id) {
          setIsPartnerOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUser = leftPresences[0];
        if (leftUser.user_id !== user.id) {
          setIsPartnerOnline(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the current user's presence
          await channel.track(userStatus);
          setIsUserOnline(true);
        }
      });

    // Update presence periodically (heartbeat)
    const heartbeat = setInterval(async () => {
      try {
        await channel.track({
          ...userStatus,
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
          ...userStatus,
          online_at: new Date().toISOString(),
        });
        setIsUserOnline(true);
      } else {
        // Optionally reduce presence when tab becomes hidden
        // We'll keep them as online but could implement "away" status
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
    };
  }, [coupleId, user]);

  return {
    isUserOnline,
    isPartnerOnline,
  };
};
