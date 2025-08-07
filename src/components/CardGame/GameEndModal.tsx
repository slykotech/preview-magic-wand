import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GameEndModalProps {
  isOpen: boolean;
  gameState: any;
  currentUserId: string;
  partnerInfo: any;
  onRematch: () => void;
  onExit: () => void;
}

export const GameEndModal: React.FC<GameEndModalProps> = ({ 
  isOpen, 
  gameState, 
  currentUserId, 
  partnerInfo, 
  onRematch, 
  onExit 
}) => {
  if (!isOpen || !gameState?.winner_id) return null;

  const isWinner = gameState.winner_id === currentUserId;
  const winReason = gameState.win_reason;

  const getWinReasonText = () => {
    switch (winReason) {
      case 'failed_tasks':
        return isWinner 
          ? "Your partner failed too many tasks!" 
          : "You failed too many tasks!";
      case 'no_skips':
        return isWinner 
          ? "Your partner used all their skips!" 
          : "You used all your skips!";
      case 'completed':
        return "Game completed!";
      default:
        return "Game ended!";
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md">
        <div className="text-center">
          {/* Result Header */}
          <div className={`p-6 rounded-lg mb-6 ${
            isWinner 
              ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
              : 'bg-gradient-to-r from-red-500 to-orange-600'
          }`}>
            <div className="text-6xl mb-2">
              {isWinner ? '🏆' : '😢'}
            </div>
            <h2 className="text-3xl font-bold text-white">
              {isWinner ? 'You Won!' : 'You Lost!'}
            </h2>
            <p className="text-white/90 mt-2">
              {getWinReasonText()}
            </p>
          </div>

          {/* Stats */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Game Statistics</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cards Played:</span>
                  <span className="font-semibold">{gameState.total_cards_played}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Failed Tasks:</span>
                  <span className="font-semibold text-destructive">
                    {currentUserId === gameState.user1_id 
                      ? gameState.user1_failed_tasks || 0
                      : gameState.user2_failed_tasks || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Skips Used:</span>
                  <span className="font-semibold text-primary">
                    {3 - (currentUserId === gameState.user1_id 
                      ? gameState.user1_skips_remaining || 0
                      : gameState.user2_skips_remaining || 0)}
                  </span>
                </div>
              </div>

              {/* Winner Reward */}
              {isWinner && (
                <div className="mt-4 p-4 bg-success/10 rounded-lg">
                  <p className="text-sm font-semibold text-success">
                    🎁 Winner's Reward: Ask your partner to fulfill one romantic wish!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={onRematch}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              size="lg"
            >
              🎮 Rematch
            </Button>
            
            <Button
              onClick={onExit}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Exit to Games
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};