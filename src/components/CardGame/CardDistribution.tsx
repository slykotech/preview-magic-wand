import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CardDistributionProps {
  gameState: any;
}

const CardDistribution: React.FC<CardDistributionProps> = ({ gameState }) => {
  const [distribution, setDistribution] = useState({
    total: { action: 0, text: 0, photo: 0 },
    currentCycle: { action: 0, text: 0, photo: 0 },
    cyclePosition: 0
  });

  useEffect(() => {
    const fetchDistribution = async () => {
      if (!gameState?.played_cards || gameState.played_cards.length === 0) {
        setDistribution({
          total: { action: 0, text: 0, photo: 0 },
          currentCycle: { action: 0, text: 0, photo: 0 },
          cyclePosition: 0
        });
        return;
      }

      const { data } = await supabase
        .from("deck_cards")
        .select("id, response_type")
        .in("id", gameState.played_cards);

      if (data) {
        // Total distribution
        const total = { action: 0, text: 0, photo: 0 };
        data.forEach(card => {
          if (total[card.response_type as keyof typeof total] !== undefined) {
            total[card.response_type as keyof typeof total]++;
          }
        });

        // Current cycle distribution
        const cyclePosition = gameState.played_cards.length % 10;
        const cycleStart = Math.floor(gameState.played_cards.length / 10) * 10;
        const currentCycleCards = gameState.played_cards.slice(cycleStart);
        
        const currentCycle = { action: 0, text: 0, photo: 0 };
        data.filter(card => currentCycleCards.includes(card.id)).forEach(card => {
          if (currentCycle[card.response_type as keyof typeof currentCycle] !== undefined) {
            currentCycle[card.response_type as keyof typeof currentCycle]++;
          }
        });

        setDistribution({ total, currentCycle, cyclePosition });
      }
    };

    fetchDistribution();
  }, [gameState?.played_cards]);

  return (
    <div className="bg-card p-3 rounded-lg border mb-4">
      <h4 className="text-sm font-semibold text-card-foreground mb-2">
        Card Distribution (Cycle {Math.floor((gameState?.played_cards?.length || 0) / 10) + 1})
      </h4>
      
      {/* Current Cycle Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Cycle Progress</span>
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

      {/* Warning if photo cards are behind */}
      {distribution.cyclePosition >= 5 && distribution.currentCycle.photo === 0 && (
        <p className="text-xs text-destructive mt-2 font-semibold">
          ⚠️ Photo cards needed in this cycle!
        </p>
      )}
    </div>
  );
};

export default CardDistribution;