import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DeckStats {
  total: number;
  played: number;
  skipped: number;
  remaining: number;
  distribution: {
    played: {
      action: number;
      text: number;
      photo: number;
    };
    remaining: {
      action: number;
      text: number;
      photo: number;
    };
  };
  nextCards: string[];
}

interface DeckVisualizationProps {
  deckStats: DeckStats | null;
}

export const DeckVisualization: React.FC<DeckVisualizationProps> = ({ deckStats }) => {
  if (!deckStats) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Loading deck information...
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (deckStats.played / deckStats.total) * 100;

  return (
    <Card className="mb-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-purple-800">
          🎴 Deck Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Cards Played</span>
            <span>{deckStats.played} / {deckStats.total}</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{deckStats.skipped} skipped</span>
            <span>{deckStats.remaining} remaining</span>
          </div>
        </div>

        {/* Cards remaining by type */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-100 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {deckStats.distribution.remaining.action}
            </div>
            <div className="text-xs text-blue-600 font-medium">Action Cards</div>
            <div className="text-xs text-gray-500">
              {deckStats.distribution.played.action} played
            </div>
          </div>
          <div className="text-center p-3 bg-green-100 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {deckStats.distribution.remaining.text}
            </div>
            <div className="text-xs text-green-600 font-medium">Text Cards</div>
            <div className="text-xs text-gray-500">
              {deckStats.distribution.played.text} played
            </div>
          </div>
          <div className="text-center p-3 bg-pink-100 rounded-lg border border-pink-200">
            <div className="text-2xl font-bold text-pink-700">
              {deckStats.distribution.remaining.photo}
            </div>
            <div className="text-xs text-pink-600 font-medium">Photo Cards</div>
            <div className="text-xs text-gray-500">
              {deckStats.distribution.played.photo} played
            </div>
          </div>
        </div>

        {/* Next cards preview */}
        {deckStats.nextCards && deckStats.nextCards.length > 0 && (
          <div className="pt-2 border-t border-purple-200">
            <div className="text-xs text-gray-600 mb-2 font-medium">
              Next 5 cards:
            </div>
            <div className="flex gap-2">
              {deckStats.nextCards.map((type: string, i: number) => (
                <div 
                  key={i}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm ${
                    type === 'action' ? 'bg-blue-200 text-blue-700 border border-blue-300' :
                    type === 'text' ? 'bg-green-200 text-green-700 border border-green-300' :
                    'bg-pink-200 text-pink-700 border border-pink-300'
                  }`}
                  title={`${type} card`}
                >
                  {type === 'action' ? '🎭' : type === 'text' ? '💬' : '📸'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distribution summary */}
        <div className="text-xs text-gray-500 pt-2 border-t border-purple-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="font-medium">🎭 Action:</span> {Math.round((deckStats.distribution.remaining.action / deckStats.remaining) * 100)}%
            </div>
            <div>
              <span className="font-medium">💬 Text:</span> {Math.round((deckStats.distribution.remaining.text / deckStats.remaining) * 100)}%
            </div>
            <div>
              <span className="font-medium">📸 Photo:</span> {Math.round((deckStats.distribution.remaining.photo / deckStats.remaining) * 100)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};