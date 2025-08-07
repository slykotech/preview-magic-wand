import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardGame } from '@/hooks/useCardGame';
import { AnimatedGameCard } from '@/components/CardGame/AnimatedGameCard';
import { TurnIndicator } from '@/components/CardGame/TurnIndicator';
import { GameStats } from '@/components/CardGame/GameStats';
import { GameStatus } from '@/components/CardGame/GameStatus';
import { GameEndModal } from '@/components/CardGame/GameEndModal';
import { DebugInfo } from '@/components/CardGame/DebugInfo';
import { TaskHistory } from '@/components/CardGame/TaskHistory';
import CardDistribution from '@/components/CardGame/CardDistribution';
import { Button } from '@/components/ui/button';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const CardDeckGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  
  const {
    gameState,
    currentCard,
    isMyTurn,
    loading,
    connectionStatus,
    partnerInfo,
    stats,
    actions,
    cardRevealed,
    blockAutoAdvance
  } = useCardGame(sessionId || null);

  // Auto-draw card when it's my turn and no current card  
  useEffect(() => {
    console.log('Auto-draw check:', {
      isMyTurn,
      currentCard: !!currentCard,
      gameStatus: gameState?.status,
      sessionId,
      loading,
      blockAutoAdvance
    });
    
    if (isMyTurn && !currentCard && gameState?.status === 'active' && !loading && !blockAutoAdvance && sessionId) {
      console.log('Auto-drawing card for user turn');
      const timer = setTimeout(() => {
        console.log('Executing auto-draw card action');
        actions.drawCard();
      }, 250); // Slightly longer delay for stability
      
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, currentCard, gameState?.status, sessionId, loading, blockAutoAdvance, actions.drawCard]);

  // Additional effect to trigger auto-draw immediately when game loads for current turn
  useEffect(() => {
    if (gameState && isMyTurn && !currentCard && !loading && gameState.status === 'active' && gameState.total_cards_played === 0) {
      console.log('First card auto-draw for new game');
      const timer = setTimeout(() => {
        actions.drawCard();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState, isMyTurn, currentCard, loading, actions.drawCard]);

  // Check for game end
  useEffect(() => {
    if (gameState?.status === 'completed' && gameState?.winner_id) {
      setShowGameEndModal(true);
    }
  }, [gameState?.status, gameState?.winner_id]);

  // Handle timer expiry - simplified since timer now handles its own logic
  const handleTimerExpire = () => {
    console.log('⏰ Timer expired in CardDeckGame - handled by GameTimer');
  };

  // Handle rematch - calls the shared rematch function
  const handleRematch = async () => {
    setShowGameEndModal(false);
    await actions.rematchGame();
  };

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
          backRoute="/games"
        />

        {/* Game Status - Shows failed tasks and skips */}
        <div className="mt-4">
          <GameStatus 
            gameState={gameState}
            currentUserId={user?.id || ''}
            partnerInfo={partnerInfo}
          />
        </div>

        {/* Legacy Game Stats for other info */}
        <GameStats 
          cardsPlayed={stats.cardsPlayed}
          skipsRemaining={stats.skipsRemaining}
        />

        {/* Turn Indicator */}
        <div className="mb-8">
          <TurnIndicator 
            isMyTurn={isMyTurn}
            partnerName={partnerInfo?.name || 'Your partner'}
            connectionStatus={connectionStatus}
          />
        </div>

        {/* Animated Game Card or Loading State */}
        <div className="mt-8">
          {currentCard ? (
            <AnimatedGameCard
              card={currentCard}
              gameState={gameState}
              isMyTurn={isMyTurn}
              isRevealed={cardRevealed}
              onReveal={actions.revealCard}
              onComplete={(response) => actions.completeTurn(response)}
              onSkip={actions.skipCard}
              skipsRemaining={stats.skipsRemaining}
              sessionId={sessionId || ''}
              userId={user?.id || ''}
              onShuffle={actions.drawCard}
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
        <div className="mt-8">
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 min-w-[140px] h-10"
            >
              📝 History
            </Button>
            
            <Button
              variant="destructive"
              onClick={actions.endGame}
              className="min-w-[140px] h-10"
            >
              End Game
            </Button>
            
            {/* Debug Controls - Development Only */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={async () => {
                  const playedCardIds = [...(gameState.played_cards || []), ...(gameState.skipped_cards || [])];
                  const { data: photoCards } = await supabase
                    .from("deck_cards")
                    .select("id")
                    .eq("response_type", "photo")
                    .eq("is_active", true)
                    .not("id", "in", playedCardIds.length > 0 ? `(${playedCardIds.join(",")})` : "()")
                    .limit(1);
                  
                  if (photoCards && photoCards.length > 0) {
                    await supabase
                      .from("card_deck_game_sessions")
                      .update({
                        current_card_id: photoCards[0].id,
                        last_activity_at: new Date().toISOString()
                      })
                      .eq("id", sessionId);
                    
                    console.log('Forced photo card:', photoCards[0].id);
                  }
                }}
                variant="secondary"
                className="min-w-[140px] h-10"
              >
                🔧 Debug
              </Button>
            )}
          </div>
        </div>

        {/* Card Distribution Tracking */}
        <CardDistribution gameState={gameState} />

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
        
        {/* Game End Modal */}
        <GameEndModal
          isOpen={showGameEndModal}
          gameState={gameState}
          currentUserId={user?.id || ''}
          partnerInfo={partnerInfo}
          onRematch={handleRematch}
          onExit={() => navigate('/games')}
        />

        {/* Task History Modal */}
        {showHistory && (
          <TaskHistory 
            sessionId={sessionId || ''} 
            isOpen={showHistory} 
            onClose={() => setShowHistory(false)} 
          />
        )}
      </div>
    </div>
  );
};