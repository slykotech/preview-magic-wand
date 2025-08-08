import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface GameStatsProps {
  cardsPlayed: number;
  skipsRemaining: number;
  totalCards?: number;
  deckStats?: any;
}

export const GameStats: React.FC<GameStatsProps> = ({ 
  cardsPlayed, 
  skipsRemaining,
  totalCards = 60,
  deckStats
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{cardsPlayed}</div>
          <div className="text-sm text-blue-600">Cards Played</div>
          <div className="text-xs text-gray-500">of {totalCards} total</div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{skipsRemaining}</div>
          <div className="text-sm text-purple-600">Skips Left</div>
          <div className="text-xs text-gray-500">use wisely</div>
        </CardContent>
      </Card>
    </div>
  );
};