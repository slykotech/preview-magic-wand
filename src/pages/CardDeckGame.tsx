import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardGame } from '@/hooks/useCardGame';
import { GameCard } from '@/components/CardGame/GameCard';
import { TurnIndicator } from '@/components/CardGame/TurnIndicator';
import { GameStats } from '@/components/CardGame/GameStats';
import { DebugInfo } from '@/components/CardGame/DebugInfo';
import { Button } from '@/components/ui/button';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';

export const CardDeckGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    gameState,
    currentCard,
    isMyTurn,
    loading,
    connectionStatus,
    partnerInfo,
    stats,
    actions,
    cardRevealed
  } = useCardGame(sessionId || null);

  // Auto-draw card when it's my turn and no current card
  useEffect(() => {
    console.log('Auto-draw check:', {
      isMyTurn,
      currentCard: !!currentCard,
      gameStatus: gameState?.status,
      sessionId
    });
    
    if (isMyTurn && !currentCard && gameState?.status === 'active') {
      console.log('Auto-drawing card for user turn');
      actions.drawCard();
    }
  }, [isMyTurn, currentCard, gameState?.status, actions, sessionId]);


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

        {/* Debug Info */}
        <div className="text-xs bg-yellow-100 p-3 rounded border mb-6">
          <p><strong>Debug Info:</strong></p>
          <p>Current Card ID: {currentCard?.id || 'None'}</p>
          <p>Game Card ID: {gameState?.current_card_id || 'None'}</p>
          <p>Card Revealed: {cardRevealed ? 'Yes' : 'No'}</p>
          <p>Has Card Data: {currentCard ? 'Yes' : 'No'}</p>
          <p>Is My Turn: {isMyTurn ? 'Yes' : 'No'}</p>
          <p>Game Status: {gameState?.status || 'Unknown'}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          {currentCard && <p>Card Prompt: {currentCard.prompt?.substring(0, 50)}...</p>}
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

        {/* Game Card or Loading State */}
        <div className="mt-8">
          {currentCard ? (
            <GameCard
              card={currentCard}
              gameState={gameState}
              isMyTurn={isMyTurn}
              isRevealed={cardRevealed}
              onReveal={actions.revealCard}
              onComplete={(response, timedOut) => actions.completeTurn(response)}
              onSkip={actions.skipCard}
              onFavorite={actions.favoriteCard}
              skipsRemaining={stats.skipsRemaining}
              sessionId={sessionId || ''}
              userId={user?.id || ''}
            />
          ) : (
            <div className="text-center p-8 bg-muted rounded-lg">
              {isMyTurn ? (
                loading ? (
                  <div>
                    <p className="text-lg font-semibold">Drawing card...</p>
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mt-4"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold">No card available</p>
                    <button 
                      onClick={actions.drawCard}
                      className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                      Draw Card
                    </button>
                  </div>
                )
              ) : (
                <p className="text-lg">Waiting for partner to play...</p>
              )}
            </div>
          )}
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

        {/* Debug Info - Remove this in production */}
        <DebugInfo 
          gameState={gameState} 
          currentUserId={user?.id || ''} 
          isMyTurn={isMyTurn} 
        />

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