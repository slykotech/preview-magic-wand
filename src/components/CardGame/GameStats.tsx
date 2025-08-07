import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface GameStatsProps {
  cardsPlayed: number;
  skipsRemaining: number;
}

export const GameStats: React.FC<GameStatsProps> = ({ 
  cardsPlayed, 
  skipsRemaining
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Card>
        <Card>
        </Card>
      </Card>
      
    </div>
  );
};