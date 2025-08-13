import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";
import { useGameSession } from "@/hooks/useGameSession";
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
  const [cardRevealed, setCardRevealed] = useState(false);
  const [blockAutoAdvance, setBlockAutoAdvance] = useState(false);
  const [lastNotificationTurn, setLastNotificationTurn] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Use unified game session management
  const { connectionStatus, sendBroadcast } = useGameSession({
    sessionId,
    gameType: 'card-deck',
    onGameStateUpdate: handleGameStateUpdate,
    onPartnerJoin: () => {
      console.log('🎮 Partner joined the card game!');
      toast.success('🎮 Partner joined! Let the games begin!');
    },
    onError: (error) => {
      console.error('🎮 Game session error:', error);
      setError(error);
    }
  });

  // Extract values from connectionStatus
  const isPartnerConnected = connectionStatus.isPartnerConnected;
  const partnerInfo = connectionStatus.partnerInfo;

  // Handle game state updates from unified session
  function handleGameStateUpdate(newGameState: any) {
    console.log('🎮 Card game state update:', newGameState);
    
    // Process state update
    const processedState = {
      ...newGameState,
      played_cards: Array.isArray(newGameState.played_cards) ? newGameState.played_cards : [],
      skipped_cards: Array.isArray(newGameState.skipped_cards) ? newGameState.skipped_cards : []
    };
    
    setGameState(processedState);
    setIsMyTurn(newGameState.current_turn === user?.id);
    
    // Sync card reveal state
    if (newGameState.current_card_revealed !== undefined) {
      setCardRevealed(newGameState.current_card_revealed);
    }
    
    // Handle card updates - fetch new card details
    if (newGameState.current_card_id) {
      fetchCurrentCard(newGameState.current_card_id);
      
      // Show turn notification
      if (newGameState.current_turn === user?.id && lastNotificationTurn !== newGameState.current_turn) {
        setLastNotificationTurn(newGameState.current_turn);
        toast.success("🎯 It's your turn!");
      }
    } else {
      setCurrentCard(null);
      setCardRevealed(false);
    }

    // Handle rematch redirection
    if (newGameState.status === 'rematch_started' && newGameState.rematch_session_id) {
      console.log('🎮 Rematch detected, redirecting to new session:', newGameState.rematch_session_id);
      toast.success("🎮 Rematch started! Redirecting to new game...");
      window.location.href = `/games/card-deck/${newGameState.rematch_session_id}`;
    }
  }

  // Fetch current card details
  const fetchCurrentCard = useCallback(async (cardId: string) => {
    try {
      const { data: cardData, error: cardError } = await supabase
        .from("deck_cards")
        .select("*")
        .eq("id", cardId)
        .single();
      
      if (!cardError && cardData) {
        setCurrentCard(cardData as CardData);
      }
    } catch (error) {
      console.error('Failed to fetch card:', error);
    }
  }, []);

  // Initialize game - simplified since unified session handles most of the work
  useEffect(() => {
    if (!user || !coupleData || !sessionId) return;

    const initializeGame = async () => {
      try {
        setLoading(true);
        console.log('Initializing card game:', sessionId);
        
        // Fetch initial game session
        const { data: gameData, error: gameError } = await supabase
          .from("card_deck_game_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (gameError) {
          console.error("Failed to fetch game:", gameError);
          setError("Failed to load game");
          return;
        }

        // Process and set initial state
        handleGameStateUpdate(gameData);

      } catch (error) {
        console.error("Failed to initialize game:", error);
        setError("Failed to initialize game");
      } finally {
        setLoading(false);
      }
    };

    initializeGame();
  }, [user, coupleData, sessionId]);

  // Real-time subscription is now handled by useGameSession hook

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

  // End game function - define before drawCard
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

  // Draw next card using RPC function - fully RPC-based now
  const drawCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !sessionId || !user) return;

    try {
      setLoading(true);
      console.log('🎲 Drawing card via RPC...');
      
      const { data, error } = await supabase.rpc('draw_card_for_session', {
        p_session_id: sessionId,
        p_user_id: user.id
      });
      
      if (error) {
        console.error("Failed to draw card:", error);
        if (error.message?.includes('No more cards available')) {
          console.log('🏁 No more cards available, ending game');
          await endGame('deck_empty');
          return;
        }
        throw error;
      }

      if (!data || (data as any).error) {
        const errorMsg = (data as any)?.error || 'No card returned';
        console.log('🏁', errorMsg);
        if (errorMsg.includes('No more cards available')) {
          await endGame('deck_empty');
        } else {
          toast.error(errorMsg);
        }
        return;
      }

      console.log('✅ Card drawn successfully via RPC:', data);
      // The RPC function handles all database updates
      // Real-time will sync the new card to the UI

    } catch (error) {
      console.error("Failed to draw card:", error);
      toast.error("Failed to draw card");
      setError("Failed to draw card");
    } finally {
      setLoading(false);
    }
  }, [gameState, isMyTurn, sessionId, user, endGame]);

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
      console.log('⏭️ Skipping card via RPC...');
      
      const { data, error } = await supabase.rpc('skip_card_turn', {
        p_session_id: sessionId,
        p_user_id: user.id
      });
      
      if (error) {
        console.error("Failed to skip card:", error);
        toast.error("Failed to skip card");
        return;
      }

      if (data && !(data as any).error) {
        const skipsRemaining = (data as any).skips_remaining || 0;
        if (skipsRemaining <= 0) {
          toast.warning("⚠️ No skips remaining!");
        } else if (skipsRemaining === 1) {
          toast.warning("⚠️ Last skip used!");
        } else {
          toast.info(`⏭️ Card skipped. ${skipsRemaining} skips remaining`);
        }
        console.log('✅ Card skipped successfully via RPC');
      } else if ((data as any)?.error) {
        toast.error((data as any).error);
      }
      
    } catch (error) {
      console.error("Failed to skip card:", error);
      toast.error("Failed to skip card");
    }
  }, [gameState, isMyTurn, sessionId, user]);

  // endGame is now defined above

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