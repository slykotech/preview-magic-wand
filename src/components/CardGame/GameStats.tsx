import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface GameStatsProps {
  cardsPlayed: number;
  skipsRemaining: number;
  favoriteCount: number;
  gameMode: string;
}

export const GameStats: React.FC<GameStatsProps> = ({ 
  cardsPlayed, 
  skipsRemaining, 
  favoriteCount, 
  gameMode 
}) => {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{cardsPlayed}</p>
          <p className="text-xs text-muted-foreground">Cards Played</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{skipsRemaining}</p>
          <p className="text-xs text-muted-foreground">Skips Left</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-pink-600">{favoriteCount}</p>
          <p className="text-xs text-muted-foreground">Favorites</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-primary capitalize">{gameMode}</p>
          <p className="text-xs text-muted-foreground">Mode</p>
        </CardContent>
      </Card>
    </div>
  );
};