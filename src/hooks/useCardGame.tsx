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
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [blockAutoAdvance, setBlockAutoAdvance] = useState(false);
  const [lastNotificationTurn, setLastNotificationTurn] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize game - enhanced initialization with shuffled deck support
  useEffect(() => {
    if (!user || !coupleData || !sessionId) return;

    const initializeGame = async () => {
      try {
        console.log('🎯 Initializing enhanced card game:', sessionId);
        
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
        
        setGameState(gameData);
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

        // Create shuffled deck if not exists
        const { data: existingDeck } = await supabase
          .from('game_decks')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1)
          .single();

        if (!existingDeck) {
          console.log('🎯 Creating shuffled deck for new game session');
          const deckManager = new DeckManager();
          await deckManager.createShuffledDeck(sessionId, 60);
        }

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

        // Enhanced partner connection detection
        const hasActivePartner = gameData.user1_id && gameData.user2_id && 
                                 gameData.user1_id !== gameData.user2_id;
        const hasGameActivity = gameData.total_cards_played > 0;
        const isGameActive = gameData.status === 'active' || gameData.status === 'rematch_started';
        
        setIsPartnerConnected(hasActivePartner && (hasGameActivity || isGameActive));
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
          
          // Handle card updates and turn changes separately
          if (newState.current_card_id && cardChanged) {
            const { data: cardData, error: cardError } = await supabase
              .from("deck_cards")
              .select("*")
              .eq("id", newState.current_card_id)
              .single();
            
            if (!cardError) {
              setCurrentCard(cardData as CardData);
            }
          } else if (!newState.current_card_id) {
            setCurrentCard(null);
            setCardRevealed(false);
          }
          
          // Handle turn notifications separately from card changes
          if (turnChanged && newState.current_turn === user.id && lastNotificationTurn !== newState.current_turn) {
            setLastNotificationTurn(newState.current_turn);
            toast.success("🎯 It's your turn!");
          }
          
          // Update connection status and partner detection
          const hasActivePartner = newState.user1_id && newState.user2_id && 
                                   newState.user1_id !== newState.user2_id;
          setConnectionStatus(hasActivePartner ? 'connected' : 'connecting');
          
          // Enhanced partner connection detection
          const hasGameActivity = newState.total_cards_played > 0 || 
                                  (Array.isArray(newState.played_cards) && newState.played_cards.length > 0);
          const isGameActive = newState.status === 'active' || newState.status === 'rematch_started';
          
          setIsPartnerConnected(hasActivePartner && (hasGameActivity || isGameActive));
        }
      )
      .subscribe((status) => {
        console.log('Real-time channel status:', status);
        if (status !== 'SUBSCRIBED') {
          setConnectionStatus('connecting');
        }
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

  // Enhanced turn completion with comprehensive response tracking
  const completeTurn = useCallback(async (response?: string | File, caption?: string, reactionTime?: number, timedOut: boolean = false) => {
    if (!gameState || !currentCard || !sessionId || !user) return;

    try {
      console.log('🎯 Complete turn with enhanced response system:', { 
        timedOut, 
        response_type: currentCard.response_type,
        user_id: user.id,
        hasResponse: !!response 
      });

      // Determine if task failed
      let isFailedTask = timedOut || (!response && currentCard.response_type !== 'action');

      // Handle different response types with enhanced tracking
      if (response && !isFailedTask) {
        if (response instanceof File) {
          // Photo upload to Supabase Storage
          const fileName = `${sessionId}/${currentCard.id}/${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('card-responses')
            .upload(fileName, response);
          
          if (!uploadError && uploadData) {
            // Save photo response
            await supabase.from("card_responses").insert({
              session_id: sessionId,
              card_id: currentCard.id,
              user_id: user.id,
              response_photo_url: fileName,
              response_photo_caption: caption,
              response_type: 'photo',
              time_taken_seconds: reactionTime,
              completed_on_time: !timedOut
            });

            // Update session with response tracking for real-time partner viewing
            await supabase.from("card_deck_game_sessions").update({
              last_response_photo_url: fileName,
              last_response_photo_caption: caption || '',
              last_response_text: null,
              last_response_author_id: user.id,
              last_response_timestamp: new Date().toISOString(),
              last_response_seen: false,
              current_card_response_type: 'photo'
            }).eq("id", sessionId);
          }
        } else {
          // Text response
          await supabase.from("card_responses").insert({
            session_id: sessionId,
            card_id: currentCard.id,
            user_id: user.id,
            response_text: response,
            response_type: 'text',
            time_taken_seconds: reactionTime,
            completed_on_time: !timedOut
          });

          // Update session with response tracking
          await supabase.from("card_deck_game_sessions").update({
            last_response_text: response,
            last_response_photo_url: null,
            last_response_photo_caption: null,
            last_response_author_id: user.id,
            last_response_timestamp: new Date().toISOString(),
            last_response_seen: false,
            current_card_response_type: 'text'
          }).eq("id", sessionId);
        }
      }

      // Update failed task counts with enhanced tracking
      const isUser1 = user.id === gameState.user1_id;
      const newUser1FailedTasks = isUser1 && isFailedTask ? 
        (gameState.user1_failed_tasks || 0) + 1 : (gameState.user1_failed_tasks || 0);
      const newUser2FailedTasks = !isUser1 && isFailedTask ? 
        (gameState.user2_failed_tasks || 0) + 1 : (gameState.user2_failed_tasks || 0);

      // Check for game over (3 strikes rule)
      const maxFailedTasks = gameState.max_failed_tasks || 3;
      if (newUser1FailedTasks >= maxFailedTasks || newUser2FailedTasks >= maxFailedTasks) {
        const winnerId = newUser1FailedTasks >= maxFailedTasks ? gameState.user2_id : gameState.user1_id;
        const winReason = timedOut ? 'opponent_timeout_failure' : 'opponent_failed_tasks';
        
        await supabase.from("card_deck_game_sessions").update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_id: winnerId,
          win_reason: winReason,
          user1_failed_tasks: newUser1FailedTasks,
          user2_failed_tasks: newUser2FailedTasks,
          session_duration: `${Date.now() - new Date(gameState.started_at).getTime()} milliseconds`,
          last_activity_at: new Date().toISOString()
        }).eq("id", sessionId);
          
        const isWinner = winnerId === user.id;
        const failureReason = timedOut ? 'timed out' : 'failed too many tasks';
        
        toast.success(isWinner ? 
          `🎉 You win! Your partner ${failureReason}!` : 
          `💔 Game Over! You ${failureReason}. Partner wins!`
        );
        return;
      }

      // Draw next card and switch turns
      const deckManager = new DeckManager();
      const nextCard = await deckManager.drawNextCard(sessionId);
      const nextTurn = gameState.current_turn === gameState.user1_id ? gameState.user2_id : gameState.user1_id;

      await supabase.from("card_deck_game_sessions").update({
        current_turn: nextCard ? nextTurn : gameState.current_turn,
        current_card_id: nextCard?.id || null,
        current_card_revealed: false,
        user1_failed_tasks: newUser1FailedTasks,
        user2_failed_tasks: newUser2FailedTasks,
        total_cards_played: gameState.total_cards_played + 1,
        last_activity_at: new Date().toISOString(),
        status: nextCard ? 'active' : 'completed'
      }).eq("id", sessionId);

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

  // Enhanced skip card function with shuffled deck support
  const skipCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !currentCard || !sessionId || !user) return;

    try {
      console.log('🔄 Processing skip with shuffled deck for user:', user.id);
      
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

  // End game - Optimized for immediate response
  const endGame = useCallback(async (reason?: string) => {
    if (!sessionId) {
      console.log('❌ EndGame: No session ID');
      return;
    }

    if (!user?.id) {
      console.log('❌ EndGame: No user ID');
      return;
    }

    try {
      console.log('🏁 Ending game immediately...', { sessionId, reason, userId: user.id });
      
      // Immediately update local state for instant UI feedback
      if (gameState) {
        setGameState({
          ...gameState,
          status: 'completed',
          win_reason: reason || 'manual_end'
        });
      }
      
      // Show immediate feedback
      toast.success("Game ended! Thanks for playing 💕");
      
      // Update database in the background without blocking UI
      supabase
        .from("card_deck_game_sessions")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          win_reason: reason || 'manual_end'
        })
        .eq("id", sessionId)
        .then(({ error }) => {
          if (error) {
            console.error('❌ EndGame database error:', error);
            // Revert local state if database update failed
            if (gameState) {
              setGameState({
                ...gameState,
                status: 'active'
              });
            }
            toast.error("Failed to save game state. Please try again.");
          } else {
            console.log('✅ Game ended successfully in database');
          }
        });

    } catch (error) {
      console.error("❌ Failed to end game:", error);
      toast.error("Failed to end game. Please try again.");
    }
  }, [sessionId, user?.id, gameState]);

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