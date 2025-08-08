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

  return (
    <div className="bg-card p-3 rounded-lg border mb-4">
      <h4 className="text-sm font-semibold text-card-foreground mb-2">
        My Card Distribution (Cycle {Math.floor(distribution.userCards / 10) + 1})
      </h4>
      
      {/* Current Cycle Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>My Cycle Progress</span>
          <span>{distribution.cyclePosition}/10</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(distribution.cyclePosition / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Type Distribution in Current Cycle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Action
          </span>
          <span className={distribution.currentCycle.action >= 4 ? 'text-green-600 font-bold' : ''}>
            {distribution.currentCycle.action}/4
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Text
          </span>
          <span className={distribution.currentCycle.text >= 3 ? 'text-green-600 font-bold' : ''}>
            {distribution.currentCycle.text}/3
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
            Photo
          </span>
          <span className={distribution.currentCycle.photo >= 3 ? 'text-green-600 font-bold' : ''}>
            {distribution.currentCycle.photo}/3
          </span>
        </div>
        
      </div>

      {/* Show total cards played by user */}
      <div className="mt-2 pt-2 border-t border-border">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total cards played by me:</span>
          <span className="font-medium">{distribution.userCards}</span>
        </div>
      </div>

      {/* Warning if photo cards are behind in user's cycle */}
      {distribution.cyclePosition >= 5 && distribution.currentCycle.photo === 0 && (
        <p className="text-xs text-destructive mt-2 font-semibold">
          ⚠️ You need photo cards in this cycle!
        </p>
      )}
    </div>
  );
};

export default CardDistribution;