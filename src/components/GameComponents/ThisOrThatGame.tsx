import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Clock } from 'lucide-react';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  time_limit_seconds: number;
}

interface ThisOrThatGameProps {
  currentCard: GameCard;
}

export const ThisOrThatGame: React.FC<ThisOrThatGameProps> = ({ currentCard }) => {
  return (
    <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 fill-current" />
            {currentCard.title}
          </CardTitle>
          <Badge variant="outline" className="capitalize bg-yellow-100 text-orange-700 border-orange-300">
            {currentCard.category.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed mb-4 text-orange-900 dark:text-orange-100">
          {currentCard.prompt}
        </CardDescription>
        
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <Clock className="w-4 h-4" />
          <span>Quick choice: {Math.round(currentCard.time_limit_seconds / 60)} minutes</span>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
            🤔 Share your choice and explain why! Learn something new about each other.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};