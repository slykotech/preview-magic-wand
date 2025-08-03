import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Star, Trophy } from 'lucide-react';

interface GameCard {
  id: string;
  title: string;
  prompt: string;
  category: string;
  time_limit_seconds: number;
}

interface CoupleQuizGameProps {
  currentCard: GameCard;
}

export const CoupleQuizGame: React.FC<CoupleQuizGameProps> = ({ currentCard }) => {
  const [gamePhase, setGamePhase] = useState<'answering' | 'comparing' | 'scoring'>('answering');
  const [score, setScore] = useState<number | null>(null);

  const handleCompareAnswers = () => {
    setGamePhase('comparing');
  };

  const handleScoreAnswer = (points: number) => {
    setScore(points);
    setGamePhase('scoring');
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <Users className="h-5 w-5 fill-current" />
            {currentCard.title}
          </CardTitle>
          <Badge variant="outline" className="capitalize bg-blue-100 text-blue-700 border-blue-300">
            {currentCard.category.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed mb-4 text-blue-900 dark:text-blue-100">
          {currentCard.prompt}
        </CardDescription>
        
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-4">
          <Clock className="w-4 h-4" />
          <span>Think and discuss: {Math.round(currentCard.time_limit_seconds / 60)} minutes</span>
        </div>

        {gamePhase === 'answering' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                🤔 Step 1: Each person writes down their answer separately, then compare!
              </p>
            </div>
            <Button 
              onClick={handleCompareAnswers}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Ready to Compare Answers
            </Button>
          </div>
        )}

        {gamePhase === 'comparing' && (
          <div className="space-y-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                👥 Step 2: Share your answers! How well did you know each other?
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={() => handleScoreAnswer(3)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Star className="w-4 h-4 mr-1" />
                Perfect Match!
              </Button>
              <Button 
                onClick={() => handleScoreAnswer(2)}
                className="bg-yellow-600 hover:bg-yellow-700"
                size="sm"
              >
                <Star className="w-4 h-4 mr-1" />
                Close!
              </Button>
              <Button 
                onClick={() => handleScoreAnswer(1)}
                className="bg-red-600 hover:bg-red-700"
                size="sm"
              >
                <Star className="w-4 h-4 mr-1" />
                Way Off
              </Button>
            </div>
          </div>
        )}

        {gamePhase === 'scoring' && score !== null && (
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-r from-gold-100 to-yellow-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                {score === 3 ? "Perfect Match!" : score === 2 ? "Good Connection!" : "Learning Opportunity!"}
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                You scored {score}/3 points! 
                {score === 3 ? " You know each other so well!" : 
                 score === 2 ? " You're on the right track!" : 
                 " There's always more to discover about each other!"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};