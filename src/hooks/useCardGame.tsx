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
  favorite_cards: any;
  user1_skips_remaining: number;
  user2_skips_remaining: number;
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

  // Initialize game
  useEffect(() => {
    if (!user || !coupleData) return;

    const initializeGame = async () => {
      try {
        if (!sessionId) {
          await createNewSession();
          return;
        }

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

        setGameState({
          ...gameData,
          played_cards: Array.isArray(gameData.played_cards) ? gameData.played_cards : [],
          skipped_cards: Array.isArray(gameData.skipped_cards) ? gameData.skipped_cards : [],
          favorite_cards: Array.isArray(gameData.favorite_cards) ? gameData.favorite_cards : []
        });
        
        // Debug logging
        console.log('Game initialized:', {
          gameData,
          currentUserId: user.id,
          currentTurn: gameData.current_turn,
          isMyTurn: gameData.current_turn === user.id,
          user1_id: gameData.user1_id,
          user2_id: gameData.user2_id
        });
        
        setIsMyTurn(gameData.current_turn === user.id);

        // Set partner info
        const partnerId = gameData.user1_id === user.id ? gameData.user2_id : gameData.user1_id;
        setPartnerInfo({
          id: partnerId,
          name: partnerId === gameData.user1_id ? "User 1" : "User 2"
        });

        // Fetch current card if exists
        if (gameData.current_card_id) {
          const { data: cardData } = await supabase
            .from("deck_cards")
            .select("*")
            .eq("id", gameData.current_card_id)
            .single();
          
          if (cardData) {
            setCurrentCard(cardData);
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

    // Set up real-time subscription
    if (sessionId) {
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
            console.log("Game update received:", payload);
            const newState = payload.new as any;
            const processedState = {
              ...newState,
              played_cards: Array.isArray(newState.played_cards) ? newState.played_cards : [],
              skipped_cards: Array.isArray(newState.skipped_cards) ? newState.skipped_cards : [],
              favorite_cards: Array.isArray(newState.favorite_cards) ? newState.favorite_cards : []
            };
            
            // Debug logging for real-time updates
            console.log('Real-time turn update:', {
              newCurrentTurn: newState.current_turn,
              myUserId: user.id,
              isNowMyTurn: newState.current_turn === user.id,
              payload
            });
            
            setGameState(processedState);
            setIsMyTurn(newState.current_turn === user.id);
            
            // Fetch new card if changed
            if (newState.current_card_id && newState.current_card_id !== gameState?.current_card_id) {
              const { data: cardData } = await supabase
                .from("deck_cards")
                .select("*")
                .eq("id", newState.current_card_id)
                .single();
              
              if (cardData) {
                setCurrentCard(cardData);
              }
              
              // Show notification if it's now my turn
              if (newState.current_turn === user.id) {
                toast.success("It's your turn! 🎯");
              }
            } else if (!newState.current_card_id) {
              setCurrentCard(null);
            }
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status);
          setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, coupleData, sessionId]);


  // This function is no longer needed as game creation is handled in Games.tsx
  const createNewSession = async () => {
    console.log('createNewSession called - this should not happen anymore');
  };

  // Draw next card
  const drawCard = useCallback(async () => {
    console.log('drawCard called:', { isMyTurn, gameState: !!gameState, sessionId });
    
    if (!isMyTurn || !gameState || !sessionId) {
      console.log('drawCard early return:', { isMyTurn, gameState: !!gameState, sessionId });
      return;
    }

    try {
      console.log('Fetching available cards...');
      
      // Get random available card
      const { data: availableCards, error } = await supabase
        .from("deck_cards")
        .select("id")
        .eq("is_active", true)
        .not("id", "in", `(${gameState.played_cards.length > 0 ? gameState.played_cards.join(",") : "'00000000-0000-0000-0000-000000000000'"})`)
        .limit(100);

      console.log('Available cards result:', { availableCards, error });

      if (error) throw error;

      if (!availableCards || availableCards.length === 0) {
        console.log('No more cards available, ending game');
        // No more cards - end game
        await endGame();
        return;
      }

      // Select random card
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      console.log('Selected random card:', randomCard);
      
      // Update game state
      console.log('Updating game state with card:', randomCard.id);
      const { error: updateError } = await supabase
        .from("card_deck_game_sessions")
        .update({
          current_card_id: randomCard.id,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      console.log('Card drawn successfully!');

    } catch (error) {
      console.error("Failed to draw card:", error);
      toast.error("Failed to draw card. Please try again.");
    }
  }, [isMyTurn, gameState, sessionId]);

  // Complete turn and switch to partner
  const completeTurn = useCallback(async (response?: string, reactionTime?: number) => {
    if (!isMyTurn || !gameState || !currentCard || !sessionId || !user) return;

    try {
      // Save response if provided
      if (response || currentCard.requires_action) {
        await supabase
          .from("card_responses")
          .insert({
            session_id: sessionId,
            card_id: currentCard.id,
            user_id: user.id,
            response_text: response,
            response_type: currentCard.requires_action ? 'action' : 'text',
            time_taken_seconds: reactionTime
          });
      }

      // Update game state
      const nextTurn = gameState.current_turn === gameState.user1_id 
        ? gameState.user2_id 
        : gameState.user1_id;

      const updatedPlayedCards = [...gameState.played_cards, currentCard.id];

      const { error } = await supabase
        .from("card_deck_game_sessions")
        .update({
          current_turn: nextTurn,
          current_card_id: null,
          played_cards: updatedPlayedCards,
          total_cards_played: gameState.total_cards_played + 1,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Update card usage count
      await supabase
        .from("deck_cards")
        .update({ usage_count: (currentCard.usage_count || 0) + 1 })
        .eq("id", currentCard.id);

      toast.success("Turn completed! 💕");

    } catch (error) {
      console.error("Failed to complete turn:", error);
      toast.error("Failed to complete turn. Please try again.");
    }
  }, [isMyTurn, gameState, currentCard, sessionId, user]);

  // Skip card (limited uses)
  const skipCard = useCallback(async () => {
    if (!isMyTurn || !gameState || !currentCard || !sessionId || !user) return;

    const skipsField = user.id === gameState.user1_id 
      ? 'user1_skips_remaining' 
      : 'user2_skips_remaining';
    
    const skipsRemaining = gameState[skipsField];

    if (skipsRemaining <= 0) {
      toast.error("No skips remaining! 😅");
      return;
    }

    try {
      const updatedSkippedCards = [...gameState.skipped_cards, currentCard.id];
      
      const { error } = await supabase
        .from("card_deck_game_sessions")
        .update({
          [skipsField]: skipsRemaining - 1,
          skipped_cards: updatedSkippedCards,
          current_card_id: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) throw error;
      
      toast.success(`Card skipped! ${skipsRemaining - 1} skips left`);
      
      // Draw new card after skip
      setTimeout(() => drawCard(), 500);

    } catch (error) {
      console.error("Failed to skip card:", error);
      toast.error("Failed to skip card");
    }
  }, [isMyTurn, gameState, currentCard, sessionId, user, drawCard]);

  // Add card to favorites
  const favoriteCard = useCallback(async () => {
    if (!currentCard || !gameState || !sessionId) return;

    try {
      const updatedFavorites = [...gameState.favorite_cards, currentCard.id];
      
      await supabase
        .from("card_deck_game_sessions")
        .update({
          favorite_cards: updatedFavorites,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      toast.success("Added to favorites! 💕");

    } catch (error) {
      console.error("Failed to favorite card:", error);
      toast.error("Failed to add to favorites");
    }
  }, [currentCard, gameState, sessionId]);

  // Pause/Resume game
  const togglePause = useCallback(async () => {
    if (!gameState || !sessionId) return;

    const newStatus = gameState.status === 'active' ? 'paused' : 'active';
    
    try {
      await supabase
        .from("card_deck_game_sessions")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      toast.success(newStatus === 'paused' ? "Game paused ⏸️" : "Game resumed ▶️");

    } catch (error) {
      console.error("Failed to toggle pause:", error);
      toast.error("Failed to update game status");
    }
  }, [gameState, sessionId]);

  // End game
  const endGame = useCallback(async () => {
    if (!sessionId) return;

    try {
      const sessionDuration = gameState ? 
        new Date().getTime() - new Date(gameState.started_at).getTime() : 0;

      await supabase
        .from("card_deck_game_sessions")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          session_duration: `${Math.floor(sessionDuration / 1000)} seconds`,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      toast.success("Game completed! Thanks for playing 💕");

    } catch (error) {
      console.error("Failed to end game:", error);
      toast.error("Failed to end game");
    }
  }, [gameState, sessionId]);

  // Auto-draw card when it's my turn and no current card
  useEffect(() => {
    console.log('Auto-draw check:', {
      isMyTurn,
      currentCard: !!currentCard,
      gameStatus: gameState?.status,
      sessionId
    });
    
    if (isMyTurn && !currentCard && gameState?.status === 'active' && sessionId) {
      console.log('Auto-drawing card...');
      drawCard();
    }
  }, [isMyTurn, currentCard, gameState?.status, sessionId, drawCard]);

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
      favoriteCount: gameState?.favorite_cards.length || 0
    },
    actions: {
      drawCard,
      completeTurn,
      skipCard,
      favoriteCard,
      togglePause,
      endGame
    }
  };
}