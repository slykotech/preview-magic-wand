import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";
import { toast } from "sonner";
import { DeckManager } from "@/utils/deckManager";

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

  // Real-time subscription - optimized to prevent duplicate notifications
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
          
          // Detect actual changes
          const turnChanged = newState.current_turn !== oldState?.current_turn;
          const cardChanged = newState.current_card_id !== oldState?.current_card_id;
          
          // Process state update
          const processedState = {
            ...newState,
            played_cards: Array.isArray(newState.played_cards) ? newState.played_cards : [],
            skipped_cards: Array.isArray(newState.skipped_cards) ? newState.skipped_cards : []
          };
          
          setGameState(processedState);
          setIsMyTurn(newState.current_turn === user.id);
          
          // Sync card reveal state
          if (newState.current_card_revealed !== undefined) {
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
    if (!isMyTurn || !gameState || !currentCard || cardRevealed) {
      console.log('Cannot reveal card:', { isMyTurn, gameState: !!gameState, currentCard: !!currentCard, cardRevealed });
      return;
    }

    console.log('Revealing card for both players...');
    
    try {
      const { error } = await supabase
        .from("card_deck_game_sessions")
        .update({
          current_card_revealed: true,
          current_card_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) throw error;
      
      console.log('Card revealed in database');
      
    } catch (error) {
      console.error('Failed to reveal card:', error);
      toast.error('Failed to reveal card');
    }
  }, [isMyTurn, gameState, currentCard, cardRevealed, sessionId]);

  // Draw next card using simple random selection
  const drawCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !sessionId) return;

    try {
      setLoading(true);
      
      const deckManager = new DeckManager();
      const nextCard = await deckManager.drawNextCard(sessionId);
      
      if (!nextCard) {
        console.log('🏁 No more cards available, ending game');
        await endGame('deck_empty');
        return;
      }

      setCurrentCard(nextCard);
      
      // Auto-reveal the card
      setTimeout(() => {
        setCardRevealed(true);
      }, 100);

    } catch (error) {
      console.error("Failed to draw card:", error);
      setError("Failed to draw card");
    } finally {
      setLoading(false);
    }
  }, [gameState, isMyTurn, sessionId]);

  // Complete turn and switch to partner with enhanced logic
  const completeTurn = useCallback(async (response?: string | File, caption?: string, reactionTime?: number, timedOut: boolean = false) => {
    if (!gameState || !currentCard || !sessionId || !user) return;

    try {
      console.log('🎯 Complete turn:', { 
        timedOut, 
        response_type: currentCard.response_type,
        user_id: user.id,
        hasResponse: !!response 
      });

      // Handle failed task if timed out or no response for required types
      let isFailedTask = false;
      if (timedOut) {
        isFailedTask = true;
        console.log('⚠️ Failed task detected: Timer expired');
      } else if (!response && (currentCard.response_type === 'text' || currentCard.response_type === 'photo')) {
        isFailedTask = true;
        console.log('⚠️ Failed task detected: No response provided');
      }

      // Save response if provided and not failed
      if (response && !isFailedTask) {
        let responseText = '';
        let responseType = currentCard.response_type || 'action';
        
        if (response instanceof File) {
          // Handle file upload
          const fileName = `${sessionId}/${currentCard.id}/${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('card-responses')
            .upload(fileName, response);
          
          if (!uploadError && uploadData) {
            responseText = fileName;
            responseType = 'photo';
          }
        } else if (typeof response === 'string') {
          responseText = response;
          responseType = 'text';
        } else {
          responseText = 'Task completed';
          responseType = 'action';
        }

        // Save response to database
        await supabase
          .from("card_responses")
          .insert({
            session_id: sessionId,
            card_id: currentCard.id,
            user_id: user.id,
            response_text: responseText,
            response_type: responseType,
            time_taken_seconds: reactionTime || null,
            completed_on_time: !timedOut
          });

        // Update game session with latest response for partner to see
        const responseUpdateData: any = {
          last_response_author_id: user.id,
          last_response_timestamp: new Date().toISOString(),
          last_response_seen: false
        };

        if (responseType === 'photo') {
          // For photo responses, responseText should already be the public URL from photo upload
          responseUpdateData.last_response_photo_url = responseText;
          responseUpdateData.last_response_photo_caption = caption || '';
          responseUpdateData.last_response_text = null; // Clear text response
        } else {
          responseUpdateData.last_response_text = responseText;
          responseUpdateData.last_response_photo_url = null; // Clear photo response
          responseUpdateData.last_response_photo_caption = null;
        }

        // Update the game session with response data
        await supabase
          .from("card_deck_game_sessions")
          .update(responseUpdateData)
          .eq("id", sessionId);
      }

      // Calculate new failed task counts
      const isUser1 = user.id === gameState.user1_id;
      const newUser1FailedTasks = isUser1 && isFailedTask ? 
        gameState.user1_failed_tasks + 1 : gameState.user1_failed_tasks;
      const newUser2FailedTasks = !isUser1 && isFailedTask ? 
        gameState.user2_failed_tasks + 1 : gameState.user2_failed_tasks;

      console.log('📊 Failed tasks update:', {
        before: { user1: gameState.user1_failed_tasks, user2: gameState.user2_failed_tasks },
        after: { user1: newUser1FailedTasks, user2: newUser2FailedTasks },
        isFailedTask,
        isUser1
      });

      // Check for game over due to failed tasks (3 strikes rule)
      const maxFailedTasks = gameState.max_failed_tasks || 3;
      if (newUser1FailedTasks >= maxFailedTasks || newUser2FailedTasks >= maxFailedTasks) {
        const winnerId = newUser1FailedTasks >= maxFailedTasks ? gameState.user2_id : gameState.user1_id;
        const winReason = timedOut ? 'opponent_timeout_failure' : 'opponent_failed_tasks';
        
        await supabase
          .from("card_deck_game_sessions")
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            winner_id: winnerId,
            win_reason: winReason,
            user1_failed_tasks: newUser1FailedTasks,
            user2_failed_tasks: newUser2FailedTasks,
            last_activity_at: new Date().toISOString()
          })
          .eq("id", sessionId);
          
        const isWinner = winnerId === user.id;
        const failureReason = timedOut ? 'timed out' : 'failed too many tasks';
        
        toast.success(isWinner ? 
          `🎉 You win! Your partner ${failureReason}!` : 
          `💔 Game Over! You ${failureReason}. Partner wins!`
        );
        return;
      }

      // Draw next card for partner
      const deckManager = new DeckManager();
      const nextCard = await deckManager.drawNextCard(sessionId);
      
      // Switch turns
      const nextTurn = gameState.current_turn === gameState.user1_id 
        ? gameState.user2_id 
        : gameState.user1_id;

      // Update game state
      await supabase
        .from("card_deck_game_sessions")
        .update({
          current_turn: nextCard ? nextTurn : gameState.current_turn,
          current_card_id: nextCard?.id || null,
          current_card_revealed: false,
          user1_failed_tasks: newUser1FailedTasks,
          user2_failed_tasks: newUser2FailedTasks,
          total_cards_played: gameState.total_cards_played + 1,
          last_activity_at: new Date().toISOString(),
          status: nextCard ? 'active' : 'completed'
        })
        .eq("id", sessionId);

      if (!nextCard) {
        toast.success("🎉 Game completed! No more cards available!");
      } else if (isFailedTask) {
        toast.error("⏰ Task failed! Turn switched to partner");
      } else {
        toast.success("✅ Turn completed! 💕");
      }

    } catch (error) {
      console.error("Failed to complete turn:", error);
      toast.error("Failed to complete turn");
    }
  }, [gameState, currentCard, sessionId, user]);

  // Enhanced skip card function with proper game logic
  const skipCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !currentCard || !sessionId || !user) return;

    try {
      console.log('🔄 Processing skip for user:', user.id);
      
      // Determine which user's skips to reduce
      const isUser1 = user.id === gameState.user1_id;
      const currentUserSkips = isUser1 ? gameState.user1_skips_remaining : gameState.user2_skips_remaining;
      
      if (currentUserSkips <= 0) {
        toast.error("No skips remaining!");
        return;
      }

      // Calculate new skip counts
      const newUser1Skips = isUser1 ? currentUserSkips - 1 : gameState.user1_skips_remaining;
      const newUser2Skips = !isUser1 ? currentUserSkips - 1 : gameState.user2_skips_remaining;
      
      console.log('📊 Skip counts:', { 
        before: { user1: gameState.user1_skips_remaining, user2: gameState.user2_skips_remaining },
        after: { user1: newUser1Skips, user2: newUser2Skips }
      });

      // Check if user runs out of skips (game over condition)
      const userRunsOutOfSkips = (isUser1 ? newUser1Skips : newUser2Skips) <= 0;
      
      if (userRunsOutOfSkips) {
        // Opponent wins when current user runs out of skips
        const winnerId = isUser1 ? gameState.user2_id : gameState.user1_id;
        
        await supabase
          .from("card_deck_game_sessions")
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            winner_id: winnerId,
            win_reason: 'opponent_no_skips',
            user1_skips_remaining: newUser1Skips,
            user2_skips_remaining: newUser2Skips,
            last_activity_at: new Date().toISOString()
          })
          .eq("id", sessionId);
          
        const isWinner = winnerId === user.id;
        toast.success(isWinner ? 
          "🎉 You win! Your partner ran out of skips!" : 
          "💔 Game Over! You ran out of skips. Partner wins!"
        );
        return;
      }

      // Add current card to skipped cards
      const deckManager = new DeckManager();
      await deckManager.skipCard(sessionId);
      
      // Draw next card for partner
      const nextCard = await deckManager.drawNextCard(sessionId);
      
      // Switch turns and update skip counts
      const nextTurn = gameState.current_turn === gameState.user1_id 
        ? gameState.user2_id 
        : gameState.user1_id;

      await supabase
        .from("card_deck_game_sessions")
        .update({
          current_turn: nextCard ? nextTurn : gameState.current_turn,
          current_card_id: nextCard?.id || null,
          current_card_revealed: false,
          user1_skips_remaining: newUser1Skips,
          user2_skips_remaining: newUser2Skips,
          last_activity_at: new Date().toISOString(),
          status: nextCard ? 'active' : 'completed'
        })
        .eq("id", sessionId);

      if (!nextCard) {
        toast.success("🎉 Game completed! No more cards available!");
      }
      
    } catch (error) {
      console.error("Failed to skip card:", error);
      toast.error("Failed to skip card");
    }
  }, [isMyTurn, gameState, currentCard, sessionId, user]);

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

  // Rematch function - Reset all game stats to initial values
  const rematchGame = useCallback(async () => {
    if (!gameState || !user) return;

    try {
      const { data: newSession, error } = await supabase
        .from('card_deck_game_sessions')
        .insert({
          couple_id: gameState.couple_id,
          user1_id: gameState.user1_id,
          user2_id: gameState.user2_id,
          current_turn: gameState.user1_id,
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

      toast.success("Rematch started! 🎮 All stats reset!");
      window.location.href = `/games/card-deck/${newSession.id}`;

    } catch (error) {
      console.error("Failed to start rematch:", error);
      toast.error("Failed to start rematch");
    }
  }, [gameState, user]);

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