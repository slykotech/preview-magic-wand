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
        <CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{cardsPlayed}</p>
          <p className="text-xs text-muted-foreground">Cards Played</p>
        </CardContent>
      </Card>
      
    </div>
  );
};