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
  winner_id?: string;
  win_reason?: string;
  game_mode: string;
  status: string;
  total_cards_played: number;
  last_activity_at: string;
  started_at: string;
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

  // Complete turn and switch to partner
  const completeTurn = useCallback(async (response?: string | File, caption?: string, reactionTime?: number, timedOut: boolean = false) => {
    if (!gameState || !currentCard || !sessionId || !user) return;

    try {
      // Save response if provided
      if (response || currentCard.requires_action) {
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
      }

      // Switch turns and draw next card for partner
      const nextTurn = gameState.current_turn === gameState.user1_id 
        ? gameState.user2_id 
        : gameState.user1_id;

      const deckManager = new DeckManager();
      const nextCard = await deckManager.drawNextCard(sessionId);

      // Update game state
      await supabase
        .from("card_deck_game_sessions")
        .update({
          current_turn: nextCard ? nextTurn : gameState.current_turn,
          current_card_id: nextCard?.id || null,
          current_card_revealed: false,
          total_cards_played: gameState.total_cards_played + 1,
          last_activity_at: new Date().toISOString(),
          status: nextCard ? 'active' : 'completed'
        })
        .eq("id", sessionId);

      if (!nextCard) {
        toast.success("Game completed! 🎉");
      } else {
        toast.success("Turn completed! 💕");
      }

    } catch (error) {
      console.error("Failed to complete turn:", error);
      toast.error("Failed to complete turn");
    }
  }, [gameState, currentCard, sessionId, user]);

  // Skip card function
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
      
      console.log('Skip counts:', { 
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
          
        toast.success("Game Over! You ran out of skips. Your partner wins! 🎉");
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
        toast.success("Game completed! No more cards available 🎉");
      } else {
        toast.success(`Card skipped! ${newUser1Skips + newUser2Skips} skips remaining total`);
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

  // Rematch function
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
          game_mode: gameState.game_mode || 'classic'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Rematch started! 🎮");
      window.location.href = `/games/card-deck/${newSession.id}`;

    } catch (error) {
      console.error("Failed to start rematch:", error);
      toast.error("Failed to start rematch");
    }
  }, [gameState, user]);

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
          gameState.user2_skips_remaining) : 0
    },
    actions: {
      drawCard,
      completeTurn,
      skipCard,
      endGame,
      revealCard,
      setBlockAutoAdvance,
      rematchGame
    },
    cardRevealed,
    blockAutoAdvance,
    error
  };
}