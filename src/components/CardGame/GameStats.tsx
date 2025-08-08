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
  return null;
};