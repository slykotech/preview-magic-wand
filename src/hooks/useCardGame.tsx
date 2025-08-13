import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";
import { toast } from "sonner";

interface GameState {
  id: string;
  couple_id: string;
  user1_id: string;
  user2_id: string;
  current_turn: string;
  current_card_id: string | null;
  played_cards: any;
  skipped_cards: any;
  user1_skips_remaining: number;
  user2_skips_remaining: number;
  user1_failed_tasks?: number;
  user2_failed_tasks?: number;
  max_failed_tasks?: number;
  max_skips?: number;
  winner_id?: string;
  win_reason?: string;
  game_mode: string;
  status: string;
  total_cards_played: number;
  last_activity_at: string;
  started_at: string;
  last_response_text?: string | null;
  last_response_photo_url?: string | null;
  last_response_photo_caption?: string | null;
  last_response_author_id?: string | null;
  last_response_timestamp?: string | null;
  last_response_seen?: boolean | null;
}

interface CardData {
  id: string;
  category: string;
  subcategory: string;
  prompt: string;
  timer_seconds: number;
  timer_category: string;
  difficulty_level: number;
  intimacy_level: number;
  requires_action: boolean;
  requires_physical_presence: boolean;
  mood_tags: string[];
  relationship_stage: string[];
  usage_count?: number;
  response_type: 'action' | 'text' | 'photo';
}

export function useCardGame(sessionId: string | null) {
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [partnerInfo, setPartnerInfo] = useState<{id: string, name: string} | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [blockAutoAdvance, setBlockAutoAdvance] = useState(false);
  const [lastNotificationTurn, setLastNotificationTurn] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);

  // Initialize game - consolidated initialization
  useEffect(() => {
    if (!user || !coupleData || !sessionId) return;

    const initializeGame = async () => {
      try {
        console.log('Initializing game:', sessionId);
        
        // Fetch game session
        const { data: gameData, error: gameError } = await supabase
          .from("card_deck_game_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (gameError) {
          console.error("Failed to fetch game:", gameError);
          setConnectionStatus('error');
          return;
        }

        const processedGameData = {
          ...gameData,
          played_cards: Array.isArray(gameData.played_cards) ? gameData.played_cards : [],
          skipped_cards: Array.isArray(gameData.skipped_cards) ? gameData.skipped_cards : []
        };
        
        setGameState(processedGameData);
        setIsMyTurn(gameData.current_turn === user.id);

        // Set partner info
        const partnerId = gameData.user1_id === user.id ? gameData.user2_id : gameData.user1_id;
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', partnerId)
          .single();
        
        setPartnerInfo({
          id: partnerId,
          name: partnerProfile?.display_name || 'Your Partner'
        });

        // Check if partner has ever accessed this session (by checking if they have any activity)
        const { data: partnerActivity } = await supabase
          .from('card_responses')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', partnerId)
          .limit(1);

        // Check if the session has any actual moves (cards drawn/played by partner)
        const playedCardsArray = Array.isArray(gameData.played_cards) ? gameData.played_cards : [];
        
        // Improved connection detection: consider partner connected if:
        // 1. Game session exists (both players can see it) OR
        // 2. They have responded to cards OR
        // 3. The game has progressed (total cards > 0) OR 
        // 4. There are any played cards OR
        // 5. The current turn is theirs (they've accessed the game) OR
        // 6. Both players are defined in the session
        const hasPartnerActivity = partnerActivity && partnerActivity.length > 0;
        const hasGameProgression = gameData.total_cards_played > 0;
        const hasPlayedCards = playedCardsArray.length > 0;
        const isPartnerTurn = gameData.current_turn === partnerId;
        const hasBothPlayers = gameData.user1_id && gameData.user2_id;
        
        // Be more optimistic about partner connection - if session exists with both players, assume connected
        const partnerConnected = !!(hasBothPlayers || hasPartnerActivity || hasGameProgression || hasPlayedCards || isPartnerTurn);
        
        console.log('Partner connection check (improved):', {
          partnerId,
          hasPartnerActivity,
          hasGameProgression,
          hasPlayedCards,
          isPartnerTurn,
          hasBothPlayers,
          partnerConnected,
          playedCardsCount: playedCardsArray.length,
          totalCardsPlayed: gameData.total_cards_played,
          currentTurn: gameData.current_turn,
          partnerResponsesFound: partnerActivity?.length || 0
        });
        
        setIsPartnerConnected(partnerConnected);

        // Fetch current card if exists
        if (gameData.current_card_id) {
          const { data: cardData, error: cardError } = await supabase
            .from("deck_cards")
            .select("*")
            .eq("id", gameData.current_card_id)
            .single();
          
          if (!cardError && cardData) {
            setCurrentCard(cardData as CardData);
            setCardRevealed(gameData.current_card_revealed || false);
          }
        }

        setConnectionStatus('connected');
      } catch (error) {
        console.error("Failed to initialize game:", error);
        setConnectionStatus('error');
      } finally {
        setLoading(false);
      }
    };

    initializeGame();
  }, [user, coupleData, sessionId]);

  // Real-time subscription - handle rematch redirection and game updates
  useEffect(() => {
    if (!sessionId || !user) return;

    const channel = supabase
      .channel(`card-game-${sessionId}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "card_deck_game_sessions",
          filter: `id=eq.${sessionId}`
        },
        async (payload) => {
          const newState = payload.new as any;
          const oldState = payload.old as any;
          
          // Handle rematch redirection - if status changed to 'rematch_started'
          if (newState.status === 'rematch_started' && newState.rematch_session_id) {
            console.log('🎮 Rematch detected, redirecting to new session:', newState.rematch_session_id);
            toast.success("🎮 Rematch started! Redirecting to new game...");
            window.location.href = `/games/card-deck/${newState.rematch_session_id}`;
            return;
          }
          
          // Detect actual changes for regular updates
          const turnChanged = newState.current_turn !== oldState?.current_turn;
          const cardChanged = newState.current_card_id !== oldState?.current_card_id;
          
          // Check if partner has now joined (game has progressed with actual activity)
          const newPlayedCardsArray = Array.isArray(newState.played_cards) ? newState.played_cards : [];
          const hasRealProgress = newPlayedCardsArray.length > 0 || newState.total_cards_played > 0;
          const isPartnerTurnNow = newState.current_turn !== user?.id;
          const hasBothPlayers = newState.user1_id && newState.user2_id;
          
          // Be optimistic about partner connection - if session exists with both players or any activity
          if (hasBothPlayers || hasRealProgress || isPartnerTurnNow) {
            console.log('Partner connection detected via game state update:', {
              hasRealProgress,
              isPartnerTurnNow,
              hasBothPlayers,
              totalCards: newState.total_cards_played,
              playedCards: newPlayedCardsArray.length
            });
            setIsPartnerConnected(true);
          }
          
          // Process state update
          const processedState = {
            ...newState,
            played_cards: Array.isArray(newState.played_cards) ? newState.played_cards : [],
            skipped_cards: Array.isArray(newState.skipped_cards) ? newState.skipped_cards : []
          };
          
          setGameState(processedState);
          setIsMyTurn(newState.current_turn === user.id);
          
          // Sync card reveal state - both players should see revealed cards
          if (newState.current_card_revealed !== undefined) {
            console.log('🎯 Syncing card reveal state:', newState.current_card_revealed);
            setCardRevealed(newState.current_card_revealed);
          }
          
          // Handle card updates
          if (newState.current_card_id && cardChanged) {
            const { data: cardData, error: cardError } = await supabase
              .from("deck_cards")
              .select("*")
              .eq("id", newState.current_card_id)
              .single();
            
            if (!cardError) {
              setCurrentCard(cardData as CardData);
            }
            
            // Show notification ONLY for meaningful turn changes to prevent spam
            const shouldNotify = turnChanged && 
                               newState.current_turn === user.id && 
                               lastNotificationTurn !== newState.current_turn;
            
            if (shouldNotify) {
              setLastNotificationTurn(newState.current_turn);
              toast.success("🎯 It's your turn!");
            }
          } else if (!newState.current_card_id) {
            setCurrentCard(null);
            setCardRevealed(false);
          }
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sessionId, lastNotificationTurn]);

  // Reveal card function - syncs with database
  const revealCard = useCallback(async (): Promise<void> => {
    if (!isMyTurn || !gameState || !currentCard || cardRevealed || !sessionId) {
      console.log('Cannot reveal card:', { isMyTurn, gameState: !!gameState, currentCard: !!currentCard, cardRevealed });
      return;
    }

    console.log('Revealing card for both players...');
    
    try {
      const { error } = await supabase.rpc('reveal_card', {
        p_session_id: sessionId,
        p_user_id: user.id
      });

      if (error) throw error;
      
      console.log('Card revealed in database');
      
    } catch (error) {
      console.error('Failed to reveal card:', error);
      toast.error('Failed to reveal card');
    }
  }, [isMyTurn, gameState, currentCard, cardRevealed, sessionId]);

  // Draw next card using RPC function
  const drawCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !sessionId || !user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('draw_card_for_session', {
        p_session_id: sessionId,
        p_user_id: user.id
      });
      
      if (error) {
        console.error("Failed to draw card:", error);
        if (error.message.includes('No more cards available')) {
          console.log('🏁 No more cards available, ending game');
          await endGame('deck_empty');
          return;
        }
        throw error;
      }

      if (!data) {
        console.log('🏁 No card returned, ending game');
        await endGame('deck_empty');
        return;
      }

      const cardData = {
        id: (data as any).card_id,
        prompt: (data as any).prompt,
        response_type: (data as any).response_type,
        timer_seconds: (data as any).timer_seconds || 60,
        category: '',
        subcategory: '',
        timer_category: '',
        difficulty_level: 1,
        intimacy_level: 1,
        requires_action: false,
        requires_physical_presence: false,
        mood_tags: [],
        relationship_stage: []
      };

      setCurrentCard(cardData);
      
      // Auto-reveal the card for all players
      setTimeout(async () => {
        setCardRevealed(true);
        // Also update the database so partner can see the revealed card
        try {
          await supabase.rpc('reveal_card', {
            p_session_id: sessionId,
            p_user_id: user.id
          });
        } catch (error) {
          console.error('Failed to sync card reveal:', error);
        }
      }, 100);

    } catch (error) {
      console.error("Failed to draw card:", error);
      setError("Failed to draw card");
    } finally {
      setLoading(false);
    }
  }, [gameState, isMyTurn, sessionId, user]);

  // Complete turn using RPC function
  const completeTurn = useCallback(async (response?: string | File, caption?: string, reactionTime?: number, timedOut: boolean = false) => {
    if (!gameState || !currentCard || !sessionId || !user) return;

    try {
      console.log('🎯 Complete turn:', { 
        timedOut, 
        response_type: currentCard.response_type,
        user_id: user.id,
        hasResponse: !!response 
      });

      // Prepare response for RPC call
      let responseText = '';
      let photoUrl = '';
      
      if (response instanceof File) {
        // Handle file upload first
        const fileName = `${sessionId}/${currentCard.id}/${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('card-responses')
          .upload(fileName, response);
        
        if (!uploadError && uploadData) {
          photoUrl = fileName;
        }
      } else if (typeof response === 'string') {
        responseText = response;
      }

      // Use RPC to complete the turn
      const { error: turnError } = await supabase.rpc('complete_card_turn', {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_response_text: responseText || null,
        p_response_photo_url: photoUrl || null,
        p_response_photo_caption: caption || null,
        p_response_time_seconds: reactionTime || null,
        p_timed_out: timedOut
      });

      if (turnError) {
        console.error('Failed to complete turn:', turnError);
        throw turnError;
      }
      
      // The RPC function handles all the turn completion logic
      console.log('Turn completed successfully via RPC');
      
      if (timedOut) {
        toast.error("⏰ Task failed! Turn switched to partner");
      } else {
        toast.success("✅ Turn completed! 💕");
      }

    } catch (error) {
      console.error("Failed to complete turn:", error);
      toast.error("Failed to complete turn");
    }
  }, [gameState, currentCard, sessionId, user]);

  const skipCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !sessionId || !user) return;

    try {
      const { data, error } = await supabase.rpc('skip_card_turn', {
        p_session_id: sessionId,
        p_user_id: user.id
      });
      
      if (error) {
        console.error("Failed to skip card:", error);
        toast.error("Failed to skip card");
        return;
      }

      if (data) {
        const skipsRemaining = (data as any).skips_remaining || 0;
        if (skipsRemaining <= 0) {
          toast.warning("⚠️ No skips remaining!");
        } else if (skipsRemaining === 1) {
          toast.warning("⚠️ Last skip used!");
        } else {
          toast.info(`⏭️ Card skipped. ${skipsRemaining} skips remaining`);
        }
      }
      
    } catch (error) {
      console.error("Failed to skip card:", error);
      toast.error("Failed to skip card");
    }
  }, [gameState, isMyTurn, sessionId, user]);

  // End game
  const endGame = useCallback(async (reason?: string) => {
    if (!sessionId) return;

    try {
      await supabase
        .from("card_deck_game_sessions")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          win_reason: reason || 'manual_end'
        })
        .eq("id", sessionId);

      toast.success("Game completed! Thanks for playing 💕");

    } catch (error) {
      console.error("Failed to end game:", error);
      toast.error("Failed to end game");
    }
  }, [sessionId]);

  // Rematch function - Automatically restart game for both users
  const rematchGame = useCallback(async () => {
    if (!gameState || !user) return;

    try {
      // Create new session with completely reset stats
      const { data: newSession, error } = await supabase
        .from('card_deck_game_sessions')
        .insert({
          couple_id: gameState.couple_id,
          user1_id: gameState.user1_id,
          user2_id: gameState.user2_id,
          current_turn: gameState.user1_id, // Always start with user1
          status: 'active',
          game_mode: gameState.game_mode || 'classic',
          // Reset all stats to initial values
          total_cards_played: 0,
          user1_skips_remaining: 3, // Reset to max skips
          user2_skips_remaining: 3, // Reset to max skips
          user1_failed_tasks: 0, // Reset failed tasks
          user2_failed_tasks: 0, // Reset failed tasks
          max_failed_tasks: 3,
          max_skips: 3,
          played_cards: [],
          skipped_cards: [],
          favorite_cards: [],
          current_card_id: null,
          current_card_revealed: false,
          current_card_completed: false,
          winner_id: null,
          win_reason: null
        })
        .select()
        .single();

      if (error) throw error;

      // Mark the old session as ended to trigger partner redirection
      await supabase
        .from('card_deck_game_sessions')
        .update({
          status: 'rematch_started',
          rematch_session_id: newSession.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      toast.success("🎮 Rematch started! Both players being redirected...");
      
      // Redirect current user immediately
      window.location.href = `/games/card-deck/${newSession.id}`;

    } catch (error) {
      console.error("Failed to start rematch:", error);
      toast.error("Failed to start rematch");
    }
  }, [gameState, user, sessionId]);

  // Mark response as seen
  const markResponseAsSeen = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await supabase
        .from("card_deck_game_sessions")
        .update({ last_response_seen: true })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Failed to mark response as seen:", error);
    }
  }, [sessionId]);

  return {
    gameState,
    currentCard,
    isMyTurn,
    loading,
    connectionStatus,
    partnerInfo,
    isPartnerConnected,
    stats: {
      cardsPlayed: gameState?.total_cards_played || 0,
      skipsRemaining: gameState && user ? 
        (user.id === gameState.user1_id ? 
          gameState.user1_skips_remaining : 
          gameState.user2_skips_remaining) : 0,
      failedTasks: gameState && user ? 
        (user.id === gameState.user1_id ? 
          gameState.user1_failed_tasks || 0 : 
          gameState.user2_failed_tasks || 0) : 0
    },
    actions: {
      drawCard,
      completeTurn,
      skipCard,
      endGame,
      revealCard,
      setBlockAutoAdvance,
      rematchGame,
      markResponseAsSeen
    },
    cardRevealed,
    blockAutoAdvance,
    error
  };
}