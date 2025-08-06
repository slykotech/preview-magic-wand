import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardGame } from '@/hooks/useCardGame';
import { GameCard } from '@/components/CardGame/GameCard';
import { TurnIndicator } from '@/components/CardGame/TurnIndicator';
import { GameStats } from '@/components/CardGame/GameStats';
import { Button } from '@/components/ui/button';
import { GradientHeader } from '@/components/GradientHeader';
import { ArrowLeft } from 'lucide-react';

export const CardDeckGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const {
    gameState,
    currentCard,
    isMyTurn,
    loading,
    connectionStatus,
    partnerInfo,
    stats,
    actions
  } = useCardGame(sessionId || null);

  const [cardRevealed, setCardRevealed] = useState(false);

  // Auto-draw card when it's my turn and no current card
  useEffect(() => {
    if (isMyTurn && !currentCard && gameState?.status === 'active') {
      actions.drawCard();
    }
  }, [isMyTurn, currentCard, gameState?.status, actions]);

  // Reset card revealed state when turn changes
  useEffect(() => {
    setCardRevealed(false);
  }, [currentCard?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">💕</div>
          <p className="text-muted-foreground">Loading your game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Game not found</p>
          <Button onClick={() => navigate('/games')}>
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <GradientHeader 
          title="Card Deck Game 💕" 
          subtitle={partnerInfo ? `Playing with ${partnerInfo.name}` : "Loading..."}
          icon="💕"
        />
        
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/games')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Button>
        </div>

        {/* Game Stats */}
        <GameStats 
          cardsPlayed={stats.cardsPlayed}
          skipsRemaining={stats.skipsRemaining}
          favoriteCount={stats.favoriteCount}
          gameMode={gameState.game_mode}
        />

        {/* Turn Indicator */}
        <div className="mb-8">
          <TurnIndicator 
            isMyTurn={isMyTurn}
            partnerName={partnerInfo?.name || 'Your partner'}
            connectionStatus={connectionStatus}
          />
        </div>

        {/* Game Card */}
        <div className="mt-8">
          <GameCard
            card={currentCard}
            isRevealed={cardRevealed}
            onReveal={() => setCardRevealed(true)}
            onComplete={actions.completeTurn}
            onSkip={actions.skipCard}
            onFavorite={actions.favoriteCard}
            disabled={!isMyTurn || gameState.status !== 'active'}
            skipsRemaining={stats.skipsRemaining}
          />
        </div>

        {/* Game Controls */}
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={actions.togglePause}
          >
            {gameState.status === 'paused' ? '▶️ Resume' : '⏸️ Pause'}
          </Button>
          
          <Button
            variant="destructive"
            onClick={actions.endGame}
          >
            End Game
          </Button>
        </div>

        {/* Game Completed Modal */}
        {gameState.status === 'completed' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center">
              <h2 className="text-3xl font-bold mb-4">Game Complete! 🎉</h2>
              <p className="text-muted-foreground mb-6">
                You played {stats.cardsPlayed} cards together!
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/games')}
                  className="w-full"
                >
                  Back to Games
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};