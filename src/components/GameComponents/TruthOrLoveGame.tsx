import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Clock } from 'lucide-react';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  time_limit_seconds: number;
}

interface TruthOrLoveGameProps {
  currentCard: GameCard;
}

export const TruthOrLoveGame: React.FC<TruthOrLoveGameProps> = ({ currentCard }) => {
  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-950/20 dark:to-red-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-pink-800 dark:text-pink-200 flex items-center gap-2">
            <Heart className="h-5 w-5 fill-current" />
            {currentCard.title}
          </CardTitle>
          <Badge variant="outline" className="capitalize bg-pink-100 text-pink-700 border-pink-300">
            {currentCard.category.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed mb-4 text-pink-900 dark:text-pink-100">
          {currentCard.prompt}
        </CardDescription>
        
        <div className="flex items-center gap-2 text-sm text-pink-600 dark:text-pink-400">
          <Clock className="w-4 h-4" />
          <span>Take your time: {Math.round(currentCard.time_limit_seconds / 60)} minutes suggested</span>
        </div>
        
        <div className="mt-4 p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
          <p className="text-sm text-pink-700 dark:text-pink-300 font-medium">
            💝 Remember: This is a safe space to be vulnerable and honest with each other.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};