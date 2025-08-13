import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";
import { toast } from "sonner";

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  isPartnerConnected: boolean;
  partnerInfo: { id: string; name: string } | null;
}

interface UseGameSessionOptions {
  sessionId: string | null;
  gameType: 'card-deck' | 'tic-toe-heart';
  onGameStateUpdate?: (gameState: any) => void;
  onPartnerJoin?: () => void;
  onError?: (error: string) => void;
}

export function useGameSession({
  sessionId,
  gameType,
  onGameStateUpdate,
  onPartnerJoin,
  onError
}: UseGameSessionOptions) {
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'connecting',
    isPartnerConnected: false,
    partnerInfo: null
  });
  
  const [channel, setChannel] = useState<any>(null);

  // Enhanced partner connection detection
  const detectPartnerConnection = useCallback(async (gameState: any): Promise<boolean> => {
    if (!sessionId || !user?.id || !gameState) return false;

    try {
      // For card deck games
      if (gameType === 'card-deck') {
        const partnerId = gameState.user1_id === user.id ? gameState.user2_id : gameState.user1_id;
        
        // Partner is connected if:
        // 1. The game session exists with both players (basic connection)
        // 2. OR there's any game activity (responses, cards played, etc.)
        // 3. OR it's partner's turn (they're actively engaged)
        
        if (!partnerId) return false;
        
        // Check for partner responses or any game activity
        const { data: partnerActivity } = await supabase
          .from('card_responses')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', partnerId)
          .limit(1);

        const playedCardsArray = Array.isArray(gameState.played_cards) ? gameState.played_cards : [];
        
        // If there's any activity, partner is definitely connected
        const hasActivity = !!(
          (partnerActivity && partnerActivity.length > 0) ||
          gameState.total_cards_played > 0 ||
          playedCardsArray.length > 0
        );
        
        if (hasActivity) return true;
        
        // For new games with no activity yet, check if both users are present in the session
        // and the game is in an active state
        const isGameActive = gameState.status === 'active' || gameState.status === 'rematch_started';
        const hasBothPlayers = gameState.user1_id && gameState.user2_id;
        
        // Consider partner connected if game is properly set up
        return isGameActive && hasBothPlayers;
      }
      
      // For tic-toe games
      if (gameType === 'tic-toe-heart') {
        return !!(
          gameState.moves_count > 0 ||
          gameState.game_status === 'playing' ||
          (gameState.user1_id && gameState.user2_id) // Both players present
        );
      }

      return false;
    } catch (error) {
      console.error('Error detecting partner connection:', error);
      return false;
    }
  }, [sessionId, user?.id, gameType]);

  // Get partner info
  const getPartnerInfo = useCallback(async (gameState: any) => {
    if (!gameState || !user?.id) return null;

    const partnerId = gameState.user1_id === user.id ? gameState.user2_id : gameState.user1_id;
    
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', partnerId)
      .single();
    
    return {
      id: partnerId,
      name: partnerProfile?.display_name || 'Your Partner'
    };
  }, [user?.id]);

  // Setup real-time subscription
  useEffect(() => {
    if (!sessionId || !user?.id) {
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      return;
    }

    console.log(`🎮 Setting up unified real-time for ${gameType}:`, sessionId);
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

    const tableName = gameType === 'card-deck' ? 'card_deck_game_sessions' : 'tic_toe_heart_games';
    const channelName = `${gameType}-${sessionId}`;

    // Function to check initial game state and update connection status
    const checkInitialGameState = async () => {
      try {
        const filter = gameType === 'card-deck' ? { id: sessionId } : { session_id: sessionId };
        const { data: gameData, error } = await supabase
          .from(tableName)
          .select('*')
          .match(filter)
          .single();

        if (!error && gameData) {
          const isPartnerConnected = await detectPartnerConnection(gameData);
          const partnerInfo = await getPartnerInfo(gameData);
          
          setConnectionStatus(prev => ({
            ...prev,
            isPartnerConnected,
            partnerInfo
          }));

          console.log(`🎮 Initial ${gameType} connection status:`, { isPartnerConnected, partnerInfo });
        }
      } catch (error) {
        console.warn(`Failed to check initial ${gameType} game state:`, error);
      }
    };

    const gameChannel = supabase
      .channel(channelName, { config: { broadcast: { ack: true } } })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: gameType === 'card-deck' ? `id=eq.${sessionId}` : `session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log(`🎮 ${gameType} game update:`, payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const gameState = payload.new;
            
            // Update connection status
            const isPartnerConnected = await detectPartnerConnection(gameState);
            const partnerInfo = await getPartnerInfo(gameState);
            
            setConnectionStatus(prev => ({
              status: 'connected',
              isPartnerConnected,
              partnerInfo
            }));

            // Notify about partner joining
            if (isPartnerConnected && !connectionStatus.isPartnerConnected && onPartnerJoin) {
              onPartnerJoin();
            }

            // Call game-specific update handler
            if (onGameStateUpdate) {
              onGameStateUpdate(gameState);
            }
          }
        }
      )
      .on('system', { event: 'CHANNEL_ERROR' }, (payload) => {
        console.error(`🎮 ${gameType} channel error:`, payload);
        setConnectionStatus(prev => ({ ...prev, status: 'error' }));
        if (onError) onError('Real-time connection failed');
      })
      .subscribe(async (status) => {
        console.log(`🎮 ${gameType} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus(prev => ({ ...prev, status: 'connected' }));
          // Check initial state once subscribed
          await checkInitialGameState();
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus(prev => ({ ...prev, status: 'error' }));
        }
      });

    setChannel(gameChannel);

    return () => {
      console.log(`🎮 Cleaning up ${gameType} subscription`);
      if (gameChannel) {
        supabase.removeChannel(gameChannel);
      }
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
    };
  }, [sessionId, user?.id, gameType, onGameStateUpdate, onPartnerJoin, onError, detectPartnerConnection, getPartnerInfo]);

  // Polling fallback
  useEffect(() => {
    if (!sessionId || connectionStatus.status === 'connected') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const tableName = gameType === 'card-deck' ? 'card_deck_game_sessions' : 'tic_toe_heart_games';
        const filter = gameType === 'card-deck' ? { id: sessionId } : { session_id: sessionId };
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .match(filter)
          .single();

        if (error) throw error;
        
        if (data && onGameStateUpdate) {
          onGameStateUpdate(data);
        }
        
        console.log(`🔄 ${gameType} polling update`);
      } catch (error) {
        console.warn(`${gameType} polling failed:`, error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [sessionId, gameType, connectionStatus.status, onGameStateUpdate]);

  return {
    connectionStatus,
    channel,
    // Utility functions
    sendBroadcast: useCallback((event: string, payload: any) => {
      if (channel) {
        channel.send({ type: 'broadcast', event, payload });
      }
    }, [channel])
  };
}