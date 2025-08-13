import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceState {
  user_id: string;
  device_id: string;
  online_at: string;
}

export const usePresence = (coupleId?: string) => {
  const [isUserOnline, setIsUserOnline] = useState(true); // User is always online when app is active
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const { user } = useAuth();
  const notifiedOnlineRef = useRef(false);
  const deviceIdRef = useRef<string>();
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<NodeJS.Timeout>();

  // Generate a unique device ID for this session
  if (!deviceIdRef.current) {
    deviceIdRef.current = `${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  useEffect(() => {
    console.log('🔄 usePresence effect triggered:', { 
      userId: user?.id, 
      coupleId,
      hasUser: !!user,
      hasCoupleId: !!coupleId 
    });
    
    if (!user) {
      console.log('❌ No user, clearing presence states');
      setIsUserOnline(false); // Only false when no user
      setIsPartnerOnline(false);
      return;
    }

    // User is always online when authenticated and app is active
    setIsUserOnline(true);

    // Only track presence when we have a couple ID
    if (!coupleId) {
      console.log('❌ No coupleId, but keeping user online');
      setIsPartnerOnline(false);
      return;
    }

    console.log('✅ Setting up presence tracking for couple:', coupleId);

    // Cleanup any existing channel and heartbeat
    if (channelRef.current) {
      console.log('🧹 Cleaning up existing channel');
      try {
        channelRef.current.untrack();
      } catch (e) {
        console.warn('Failed to untrack existing channel:', e);
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    }

    const channel = supabase.channel(`couple_presence_${coupleId}`, {
      config: {
        presence: {
          key: deviceIdRef.current
        }
      }
    });
    channelRef.current = channel;

    // Track user's presence with unique device ID
    const userStatus: PresenceState = {
      user_id: user.id,
      device_id: deviceIdRef.current!,
      online_at: new Date().toISOString(),
    };

    // Helper function to update presence states
    const updatePresenceStates = (presenceState: any) => {
      console.log('🔄 Current presence state:', presenceState);
      
      // User is always online when app is active - don't update from presence
      // Only check if partner is online (any other user in the couple channel, from any device)
      const allPresences = Object.values(presenceState).flat() as PresenceState[];
      const partnerPresent = allPresences.some((presence: PresenceState) => 
        presence.user_id !== user.id
      );
      
      console.log('🔄 All presences:', allPresences);
      console.log('🔄 Partner present:', partnerPresent);
      console.log('🔄 Current user ID:', user.id);
      
      // Don't update user presence - keep it as true when app is active
      setIsPartnerOnline(partnerPresent);
      
      if (partnerPresent) {
        console.log('✅ Partner is ONLINE');
      } else {
        console.log('❌ Partner is OFFLINE');
      }
    };

    // Set up presence tracking with improved event handling
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        console.log('Presence sync event:', newState);
        updatePresenceStates(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Presence join event:', { key, newPresences });
        // Immediately update states when someone joins
        const currentState = channel.presenceState();
        updatePresenceStates(currentState);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Presence leave event:', { key, leftPresences });
        // Immediately update states when someone leaves
        const currentState = channel.presenceState();
        updatePresenceStates(currentState);
      })
      .subscribe(async (status) => {
        console.log('📡 Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Track the current user's presence
          console.log('📡 Tracking user presence:', userStatus);
          const trackResult = await channel.track(userStatus);
          console.log('📡 Track result:', trackResult);
          
          // Set user as online immediately after successful tracking
          setIsUserOnline(true);
          
          // Initial check for existing presences
          const initialState = channel.presenceState();
          console.log('📡 Initial presence state after subscription:', initialState);
          updatePresenceStates(initialState);

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
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - partner presence may not be working, but user stays online');
          // Keep user online since they're actively using the app
          setIsUserOnline(true);
          setIsPartnerOnline(false); // Partner status unknown due to error
        }
      });

    // Update presence periodically (heartbeat) with improved error handling
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current && channelRef.current.state === 'joined') {
        try {
          const heartbeatStatus = {
            user_id: user.id,
            device_id: deviceIdRef.current!,
            online_at: new Date().toISOString(),
          };
          console.log('Sending heartbeat:', heartbeatStatus);
          await channelRef.current.track(heartbeatStatus);
        } catch (error) {
          console.error('Heartbeat update failed:', error);
        }
      } else {
        console.warn('Channel not ready for heartbeat');
      }
    }, 15000); // Update every 15 seconds for better responsiveness

    // Handle tab visibility changes with immediate updates
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        console.log('Tab became visible - updating presence');
        try {
          await channelRef.current.track({
            user_id: user.id,
            device_id: deviceIdRef.current!,
            online_at: new Date().toISOString(),
          });
          setIsUserOnline(true);
        } catch (error) {
          console.error('Failed to update presence on visibility change:', error);
        }
      }
    };

    // Handle browser/app close to immediately notify offline status
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        // Use navigator.sendBeacon for reliable offline notification
        try {
          navigator.sendBeacon('/api/offline', JSON.stringify({ 
            coupleId, 
            userId: user.id,
            deviceId: deviceIdRef.current 
          }));
        } catch (e) {
          console.warn('Failed to send offline beacon:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('Cleaning up presence hook');
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = undefined;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (channelRef.current) {
        // Untrack presence before removing channel
        try {
          channelRef.current.untrack();
        } catch (e) {
          console.warn('Failed to untrack presence:', e);
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Only set user offline if there's no user (logout), otherwise keep online
      if (!user) {
        setIsUserOnline(false);
      }
      setIsPartnerOnline(false);
      notifiedOnlineRef.current = false;
    };
  }, [coupleId, user?.id]); // Add user.id to dependencies for better reactivity

  return {
    isUserOnline,
    isPartnerOnline,
  };
};
