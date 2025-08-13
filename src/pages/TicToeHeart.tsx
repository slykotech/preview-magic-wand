import React from 'react';
import { TicToeHeartGame } from '@/components/TicToeHeartGame';
import { useParams } from 'react-router-dom';

export const TicToeHeart: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  
  return <TicToeHeartGame sessionId={sessionId} />;
};