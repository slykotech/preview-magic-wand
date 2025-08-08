import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CardDistributionProps {
  gameState: any;
}

const CardDistribution: React.FC<CardDistributionProps> = ({ gameState }) => {
  const { user } = useAuth();
  const [distribution, setDistribution] = useState({
    total: { action: 0, text: 0, photo: 0 },
    currentCycle: { action: 0, text: 0, photo: 0 },
    cyclePosition: 0,
    userCards: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserDistribution = async () => {
      setIsLoading(true);
      
      if (!gameState?.id || !user?.id) {
        setDistribution({
          total: { action: 0, text: 0, photo: 0 },
          currentCycle: { action: 0, text: 0, photo: 0 },
          cyclePosition: 0,
          userCards: 0
        });
        setIsLoading(false);
        return;
      }

      // Get all card responses for this user
      const { data: userResponses } = await supabase
        .from("card_responses")
        .select("card_id, user_id, created_at")
        .eq("session_id", gameState.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!userResponses || userResponses.length === 0) {
        setDistribution({
          total: { action: 0, text: 0, photo: 0 },
          currentCycle: { action: 0, text: 0, photo: 0 },
          cyclePosition: 0,
          userCards: 0
        });
        setIsLoading(false);
        return;
      }

      // Get deck card details for the user's responses
      const cardIds = userResponses.map(r => r.card_id);
      const { data: deckCards } = await supabase
        .from("deck_cards")
        .select("id, response_type")
        .in("id", cardIds);

      if (!deckCards) {
        setIsLoading(false);
        return;
      }

      // Create a map for quick lookup
      const cardTypeMap = new Map(deckCards.map(card => [card.id, card.response_type]));

      // Calculate totals for this user
      const total = { action: 0, text: 0, photo: 0 };
      userResponses.forEach(response => {
        const responseType = cardTypeMap.get(response.card_id);
        if (responseType && total[responseType as keyof typeof total] !== undefined) {
          total[responseType as keyof typeof total]++;
        }
      });

      // Calculate current cycle (every 10 cards this user played)
      const userCardsCount = userResponses.length;
      const cyclePosition = userCardsCount % 10;
      const cycleStart = Math.floor(userCardsCount / 10) * 10;
      const currentCycleResponses = userResponses.slice(cycleStart);
      
      const currentCycle = { action: 0, text: 0, photo: 0 };
      currentCycleResponses.forEach(response => {
        const responseType = cardTypeMap.get(response.card_id);
        if (responseType && currentCycle[responseType as keyof typeof currentCycle] !== undefined) {
          currentCycle[responseType as keyof typeof currentCycle]++;
        }
      });

      console.log('📊 User Distribution Debug:', {
        userId: user.id,
        userCardsCount,
        cyclePosition,
        currentCycle,
        total,
        currentCycleResponsesCount: currentCycleResponses.length
      });

      setDistribution({ 
        total, 
        currentCycle, 
        cyclePosition,
        userCards: userCardsCount
      });
      
      setIsLoading(false);
    };

    fetchUserDistribution();
  }, [gameState?.id, user?.id, gameState?.total_cards_played]);

  return null;
};

export default CardDistribution;