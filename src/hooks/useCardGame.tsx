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
          console.log('Fetching current card:', gameData.current_card_id);
          const { data: cardData, error: cardError } = await supabase
            .from("deck_cards")
            .select("*")
            .eq("id", gameData.current_card_id)
            .single();
          
          if (cardError) {
            console.error('Failed to fetch current card:', cardError);
            // If card fetch fails, clear the current_card_id
            await supabase
              .from("card_deck_game_sessions")
              .update({ current_card_id: null })
              .eq("id", sessionId);
          } else if (cardData) {
            console.log('Current card fetched successfully:', cardData);
            setCurrentCard(cardData as CardData);
            // Set reveal state based on database
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
            console.group("📨 REAL-TIME UPDATE RECEIVED");
            console.log("Event Type:", payload.eventType);
            console.log("Full Payload:", payload);
            
            const newState = payload.new as any;
            const oldState = payload.old as any;
            
            // Check for response updates specifically
            const responseChanged = newState.current_card_response !== oldState?.current_card_response;
            const cardChanged = newState.current_card_id !== oldState?.current_card_id;
            const turnChanged = newState.current_turn !== oldState?.current_turn;
            
            console.log("🔍 Change Detection:", {
              responseChanged,
              cardChanged,
              turnChanged,
              oldResponse: oldState?.current_card_response,
              newResponse: newState.current_card_response,
              oldTurn: oldState?.current_turn,
              newTurn: newState.current_turn
            });
            
            if (responseChanged) {
              console.log("🎉 RESPONSE UPDATE DETECTED!");
              console.log("Response Details:", {
                text: newState.current_card_response,
                type: newState.current_card_response_type,
                timestamp: newState.current_card_responded_at,
                cardId: newState.current_card_id
              });
            }
            
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
            console.groupEnd();
            
            // Sync card reveal state
            if (newState.current_card_revealed !== undefined) {
              setCardRevealed(newState.current_card_revealed);
            }
            
            // IMPORTANT: Fetch the card data when current_card_id changes
            if (newState.current_card_id) {
              console.log('Fetching card from real-time update:', newState.current_card_id);
              
              const { data: cardData, error: cardError } = await supabase
                .from("deck_cards")
                .select("*")
                .eq("id", newState.current_card_id)
                .single();
              
              if (cardError) {
                console.error('Failed to fetch card from real-time:', cardError);
              } else {
                console.log('Card fetched successfully from real-time:', cardData);
                setCurrentCard(cardData as CardData);
              }
              
              // Show notification if it's now my turn
              if (newState.current_turn === user.id) {
                toast.success("It's your turn! 🎯");
              }
            } else {
              // Clear card when no current_card_id
              console.log('No current_card_id, clearing card');
              setCurrentCard(null);
              setCardRevealed(false);
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

  // This function is no longer needed as game creation is handled in Games.tsx
  const createNewSession = async () => {
    console.log('createNewSession called - this should not happen anymore');
  };

  // Draw next card with comprehensive error handling and immediate card setting
  const drawCard = useCallback(async () => {
    console.log('🎯 drawCard called:', { 
      isMyTurn, 
      gameState: !!gameState, 
      sessionId,
      playedCards: gameState?.played_cards?.length || 0 
    });
    
    if (!isMyTurn || !gameState || !sessionId) {
      console.log('❌ drawCard early return:', { isMyTurn, gameState: !!gameState, sessionId });
      return;
    }

    try {
      console.log('🔍 Fetching available cards...');
      
      // Get available cards with full data
      let query = supabase
        .from("deck_cards")
        .select("*") // Get all fields, not just id
        .eq("is_active", true);

      // Exclude played cards
      if (gameState.played_cards && Array.isArray(gameState.played_cards) && gameState.played_cards.length > 0) {
        const validPlayedCards = gameState.played_cards.filter(id => id && typeof id === 'string');
        if (validPlayedCards.length > 0) {
          console.log('🚫 Filtering out played cards:', validPlayedCards);
          query = query.not("id", "in", `(${validPlayedCards.join(",")})`);
        }
      }

      // Exclude skipped cards  
      if (gameState.skipped_cards && Array.isArray(gameState.skipped_cards) && gameState.skipped_cards.length > 0) {
        const validSkippedCards = gameState.skipped_cards.filter(id => id && typeof id === 'string');
        if (validSkippedCards.length > 0) {
          console.log('⏭️ Filtering out skipped cards:', validSkippedCards);
          query = query.not("id", "in", `(${validSkippedCards.join(",")})`);
        }
      }

      const { data: availableCards, error } = await query.limit(100);

      console.log('📊 Available cards result:', { 
        count: availableCards?.length || 0, 
        error: error?.message || 'none',
        playedCardsCount: gameState.played_cards?.length || 0
      });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!availableCards || availableCards.length === 0) {
        console.log('🏁 No more cards available, ending game');
        toast.error("No more cards available!");
        await endGame();
        return;
      }

      // Select random card
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      console.log('🎲 Selected random card:', randomCard);
      
      // Set the card locally immediately for better UX
      setCurrentCard(randomCard as CardData);
      
      // Update game state with the new card
      console.log('💾 Updating game state with card:', randomCard.id);
      const updateData = {
        current_card_id: randomCard.id,
        current_card_revealed: false,
        current_card_started_at: null,
        current_card_completed: false,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("card_deck_game_sessions")
        .update(updateData)
        .eq("id", sessionId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        setCurrentCard(null); // Clear card on error
        throw new Error(`Failed to update game: ${updateError.message}`);
      }
      
      console.log('✅ Card drawn successfully!');
      toast.success("New card drawn!");

    } catch (error) {
      console.error("💥 Failed to draw card - Full error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to draw card: ${errorMessage}`);
      setCurrentCard(null); // Clear card on error
      
      // Add more specific error handling
      if (errorMessage.includes('permission denied') || errorMessage.includes('policy violation')) {
        console.error('🔒 Permission/RLS issue detected');
        toast.error("Permission denied. Please check if you're properly logged in.");
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        console.error('🌐 Network issue detected');
        toast.error("Network error. Please check your connection.");
      }
    }
  }, [isMyTurn, gameState, sessionId]);

  // Complete turn and switch to partner
  const completeTurn = useCallback(async (response?: string | File, reactionTime?: number) => {
    console.group('🎯 COMPLETE TURN FLOW');
    console.log('Starting completeTurn with:', {
      response,
      hasResponse: !!response,
      responseLength: typeof response === 'string' ? response.length : 'N/A',
      currentCard: currentCard?.id,
      cardType: currentCard?.response_type,
      isMyTurn,
      currentUserId: user?.id,
      sessionId
    });
    
    if (!gameState || !currentCard || !sessionId || !user) {
      const errorMsg = `Cannot complete turn: ${!gameState ? 'No game state' : !currentCard ? 'No current card' : !sessionId ? 'No session ID' : 'No user'}`;
      console.error('❌ ' + errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    // Enhanced turn validation with more debugging
    console.log('🔍 Turn validation:', {
      currentTurn: gameState.current_turn,
      userId: user.id,
      isMatch: user.id === gameState.current_turn,
      isUser1: user.id === gameState.user1_id,
      isUser2: user.id === gameState.user2_id
    });
    
    // Allow either the current turn holder OR if the user is one of the game participants
    const isValidPlayer = user.id === gameState.user1_id || user.id === gameState.user2_id;
    const isTurnHolder = user.id === gameState.current_turn;
    
    if (!isValidPlayer) {
      console.error('❌ User not part of this game');
      toast.error("You're not part of this game!");
      return;
    }
    
    // For debugging, allow any valid player to complete (remove strict turn checking for now)
    console.log('✅ Player validation passed, proceeding with turn completion');

    try {
      // Save response for action cards or if response is provided
      console.log('💾 Response saving logic:', {
        hasResponse: !!response,
        requiresAction: currentCard.requires_action,
        responseType: currentCard.response_type,
        shouldSaveResponse: response || currentCard.requires_action
      });
      
      if (response || currentCard.requires_action || currentCard.response_type === 'action') {
        let responseText = '';
        let responseType = currentCard.response_type || 'action';
        
        console.log('💾 Preparing to save response:', { response, responseType, cardId: currentCard.id });
        
        if (response instanceof File) {
          // Handle file upload to Supabase Storage
          const fileName = `${sessionId}/${currentCard.id}/${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('card-responses')
            .upload(fileName, response);
          
          if (!uploadError && uploadData) {
            responseText = fileName; // Store file path
            responseType = 'photo';
          } else {
            console.error('❌ File upload failed:', uploadError);
            throw new Error('Failed to upload photo');
          }
        } else if (typeof response === 'string') {
          responseText = response;
          responseType = 'text';
        } else {
          // For action cards, save a default response
          responseText = 'Task completed';
          responseType = 'action';
        }

        // First, update the game session with response for real-time sharing
        if (responseText) {
          console.group('💬 UPDATING GAME SESSION WITH RESPONSE');
          console.log('Response details:', {
            responseText,
            responseType,
            sessionId,
            cardId: currentCard.id,
            userId: user.id
          });
          
          const { data: sessionData, error: sessionUpdateError } = await supabase
            .from("card_deck_game_sessions")
            .update({
              current_card_response: responseText,
              current_card_response_type: responseType,
              current_card_responded_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", sessionId)
            .select()
            .single();

          if (sessionUpdateError) {
            console.error('❌ Error updating session with response:', sessionUpdateError);
            console.groupEnd();
          } else {
            console.log('✅ Game session updated successfully:', sessionData);
            console.log('🔄 Real-time event should now fire for partner');
            console.log('⏳ Waiting 3 seconds for partner to see response...');
            console.groupEnd();
            // Give a moment for the partner to see the response before proceeding
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        const responseData = {
          session_id: sessionId,
          card_id: currentCard.id,
          user_id: user.id,
          response_text: responseText,
          response_type: responseType,
          time_taken_seconds: reactionTime || null
        };
        
        console.log('📝 Inserting response to database:', responseData);
        
        try {
          const { data: insertedResponse, error: responseError } = await supabase
            .from("card_responses")
            .insert(responseData)
            .select()
            .single();
            
          if (responseError) {
            console.error('❌ Failed to insert response:', responseError);
            console.error('Response error details:', {
              code: responseError.code,
              message: responseError.message,
              details: responseError.details,
              hint: responseError.hint
            });
            throw responseError;
          }
          
          console.log('✅ Response inserted successfully:', insertedResponse);
        } catch (insertError) {
          console.error('❌ Insert operation failed:', insertError);
          // Continue with turn completion even if response save fails
          toast.error('Response save failed, but continuing turn');
        }
      }

      // Update game state - switch turn and mark card as completed
      const nextTurn = gameState.current_turn === gameState.user1_id 
        ? gameState.user2_id 
        : gameState.user1_id;

      const updatedPlayedCards = [...(gameState.played_cards || []), currentCard.id];

      console.log('🔄 Updating game state:', {
        sessionId,
        currentTurn: gameState.current_turn,
        nextTurn,
        cardId: currentCard.id,
        totalPlayed: gameState.total_cards_played
      });

      // First, let's draw the next card for the partner
      console.log('🎯 Drawing next card for partner before switching turns');
      let nextCardId = null;
      
      try {
        // Get available cards for the next player
        let query = supabase
          .from("deck_cards")
          .select("id")
          .eq("is_active", true);

        // Exclude played cards (including the one we just completed)
        if (updatedPlayedCards.length > 0) {
          const validPlayedCards = updatedPlayedCards.filter(id => id && typeof id === 'string');
          if (validPlayedCards.length > 0) {
            query = query.not("id", "in", `(${validPlayedCards.join(",")})`);
          }
        }

        // Exclude skipped cards  
        if (gameState.skipped_cards && Array.isArray(gameState.skipped_cards) && gameState.skipped_cards.length > 0) {
          const validSkippedCards = gameState.skipped_cards.filter(id => id && typeof id === 'string');
          if (validSkippedCards.length > 0) {
            query = query.not("id", "in", `(${validSkippedCards.join(",")})`);
          }
        }

        const { data: availableCards, error: cardError } = await query.limit(100);

        if (cardError) {
          console.error('❌ Error fetching next card:', cardError);
        } else if (availableCards && availableCards.length > 0) {
          // Select random card for next player
          const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
          nextCardId = randomCard.id;
          console.log('✅ Next card selected:', nextCardId);
        } else {
          console.log('🏁 No more cards available for next player');
        }
      } catch (error) {
        console.error('❌ Failed to fetch next card:', error);
      }

      const updateData: any = {
        current_turn: nextTurn,
        current_card_id: nextCardId, // Set the next card immediately
        current_card_revealed: false,
        current_card_started_at: null,
        current_card_completed: false, // Reset for next turn
        current_card_response: null, // Clear response for next turn
        current_card_response_type: null,
        current_card_responded_at: null,
        played_cards: updatedPlayedCards,
        total_cards_played: gameState.total_cards_played + 1,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add response data for text responses to show next player
      if (response && typeof response === 'string' && currentCard.response_type === 'text') {
        console.log('💬 Adding text response data for next player...');
        updateData.last_response_text = response;
        updateData.last_response_author_id = user.id;
        updateData.last_response_timestamp = new Date().toISOString();
        updateData.last_response_seen = false;
        
        console.log('Response data to save:', {
          text: response.substring(0, 50) + '...',
          authorId: user.id,
          seen: false
        });
      } else {
        console.log('🧹 Clearing previous response data (not a text task)');
        updateData.last_response_text = null;
        updateData.last_response_author_id = null;
        updateData.last_response_timestamp = null;
        updateData.last_response_seen = true;
      }

      const { data: updatedData, error: updateError } = await supabase
        .from("card_deck_game_sessions")
        .update(updateData)
        .eq("id", sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Game state update failed:', updateError);
        throw updateError;
      }
      
      console.log('✅ Game state updated successfully:', updatedData);
      console.log('Response fields after update:', {
        last_response_text: updatedData?.last_response_text,
        last_response_author_id: updatedData?.last_response_author_id,
        last_response_seen: updatedData?.last_response_seen
      });

      // Update card usage count for the completed card
      await supabase
        .from("deck_cards")
        .update({ usage_count: (currentCard.usage_count || 0) + 1 })
        .eq("id", currentCard.id);

      toast.success("Turn completed! 💕");

    } catch (error) {
      console.error("Failed to complete turn:", error);
      toast.error("Failed to complete turn. Please try again.");
    } finally {
      console.groupEnd();
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
      endGame,
      revealCard,
      setBlockAutoAdvance
    },
    cardRevealed,
    blockAutoAdvance
  };
}