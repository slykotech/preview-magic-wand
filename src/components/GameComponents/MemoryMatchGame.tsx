import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Clock, CheckCircle, XCircle } from 'lucide-react';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  time_limit_seconds: number;
}

interface MemoryMatchGameProps {
  currentCard: GameCard;
}

export const MemoryMatchGame: React.FC<MemoryMatchGameProps> = ({ currentCard }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [userGuessed, setUserGuessed] = useState(false);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-purple-800 dark:text-purple-200 flex items-center gap-2">
            <Brain className="h-5 w-5 fill-current" />
            {currentCard.title}
          </CardTitle>
          <Badge variant="outline" className="capitalize bg-purple-100 text-purple-700 border-purple-300">
            {currentCard.category.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed mb-4 text-purple-900 dark:text-purple-100">
          {currentCard.prompt}
        </CardDescription>
        
        <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 mb-4">
          <Clock className="w-4 h-4" />
          <span>Think carefully: {Math.round(currentCard.time_limit_seconds / 60)} minutes</span>
        </div>

        {!userGuessed ? (
          <div className="space-y-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                🧠 Step 1: Make your guess first, then let your partner reveal the answer!
              </p>
            </div>
            <Button 
              onClick={() => setUserGuessed(true)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              I've Made My Guess!
            </Button>
          </div>
        ) : !showAnswer ? (
          <div className="space-y-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                👀 Step 2: Now your partner will reveal the real answer!
              </p>
            </div>
            <Button 
              onClick={() => setShowAnswer(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
              variant="outline"
            >
              Reveal the Answer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                🎯 Step 3: Compare your guess with the real answer! How close were you?
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Got it Right!
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Close Enough
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};