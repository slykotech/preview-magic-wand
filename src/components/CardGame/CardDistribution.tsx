import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CardDistributionProps {
  gameState: any;
}

const CardDistribution: React.FC<CardDistributionProps> = ({ gameState }) => {
  const [distribution, setDistribution] = useState({ action: 0, text: 0, photo: 0 });
  
  useEffect(() => {
    const fetchDistribution = async () => {
      if (!gameState?.played_cards || gameState.played_cards.length === 0) {
        setDistribution({ action: 0, text: 0, photo: 0 });
        return;
      }
      
      const { data } = await supabase
        .from("deck_cards")
        .select("response_type")
        .in("id", gameState.played_cards);
      
      if (data) {
        setDistribution({
          action: data.filter(c => c.response_type === 'action').length,
          text: data.filter(c => c.response_type === 'text').length,
          photo: data.filter(c => c.response_type === 'photo').length
        });
      }
    };
    
    fetchDistribution();
  }, [gameState?.played_cards]);
  
  const total = distribution.action + distribution.text + distribution.photo;
  
  return (
    <div className="bg-card p-3 rounded-lg border mb-4">
      <h4 className="text-sm font-semibold text-card-foreground mb-2">Card Distribution</h4>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Action: {distribution.action}</span>
          <span>{total > 0 ? Math.round((distribution.action / total) * 100) : 0}%</span>
        </div>
        <div className="flex justify-between">
          <span>Text: {distribution.text}</span>
          <span>{total > 0 ? Math.round((distribution.text / total) * 100) : 0}%</span>
        </div>
        <div className="flex justify-between text-destructive font-semibold">
          <span>Photo: {distribution.photo}</span>
          <span>{total > 0 ? Math.round((distribution.photo / total) * 100) : 0}%</span>
        </div>
      </div>
      {distribution.photo === 0 && total > 10 && (
        <p className="text-xs text-destructive mt-2">⚠️ No photo cards drawn yet!</p>
      )}
    </div>
  );
};

export default CardDistribution;