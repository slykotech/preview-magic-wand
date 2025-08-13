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
import { WaitingForPartner } from '@/components/CardGame/WaitingForPartner';
import { Button } from '@/components/ui/button';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { usePresence } from '@/hooks/usePresence';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const CardDeckGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { isPartnerOnline } = usePresence(coupleData?.id);
  const [showHistory, setShowHistory] = useState(false);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  
  const {
    gameState,
    currentCard,
    isMyTurn,
    loading,
    connectionStatus,
    partnerInfo,
    isPartnerConnected,
    stats,
    actions,
    cardRevealed,
    blockAutoAdvance
  } = useCardGame(sessionId || null);

  // Single consolidated auto-draw effect with proper conditions
  useEffect(() => {
    console.log('Auto-draw check:', {
      isMyTurn,
      currentCard: !!currentCard,
      gameStatus: gameState?.status,
      sessionId,
      loading,
      blockAutoAdvance
    });
    
    // Only auto-draw if all conditions are met and avoid multiple calls
    if (
      isMyTurn && 
      !currentCard && 
      gameState?.status === 'active' && 
      !loading && 
      !blockAutoAdvance && 
      sessionId
    ) {
      console.log('Auto-drawing card for user turn');
      const timer = setTimeout(() => {
        console.log('Executing auto-draw card action');
        actions.drawCard();
      }, 500); // Single delay
      
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, currentCard, gameState?.status, sessionId, loading, blockAutoAdvance, actions.drawCard]);

  // Check for game end
  useEffect(() => {
    if (gameState?.status === 'completed' && gameState?.winner_id) {
      setShowGameEndModal(true);
    }
  }, [gameState?.status, gameState?.winner_id]);

  // Handle timer expiry - call completeTurn with timeout
  const handleTimerExpire = () => {
    console.log('⏰ Timer expired in CardDeckGame - triggering failed task');
    actions.completeTurn(undefined, undefined, undefined, true); // timedOut = true
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

  // Show waiting screen if partner hasn't joined yet
  if (!loading && !isPartnerConnected && partnerInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <GradientHeader 
            title="Card Deck Game 💕" 
            subtitle="Waiting for your partner..."
            icon="💕"
            backRoute="/games"
          />
          <WaitingForPartner 
            partnerName={partnerInfo.name}
            onBackToGames={() => navigate('/games')}
          />
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
          connectionStatus={connectionStatus || 'connecting'}
          isPartnerOnline={isPartnerOnline}
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
              onComplete={(response, caption, reactionTime, timedOut) => actions.completeTurn(response, caption, reactionTime, timedOut)}
              onSkip={actions.skipCard}
              skipsRemaining={stats.skipsRemaining}
              sessionId={sessionId || ''}
              userId={user?.id || ''}
              onShuffle={() => {
                console.log('🔀 Shuffle requested - drawing new card with enhanced randomness');
                actions.drawCard();
              }}
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
          <div className="flex justify-center items-center gap-6 flex-wrap bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-600">Cards Played:</span>
              <span className="text-lg font-bold text-blue-600">{stats.cardsPlayed}</span>
            </div>


            
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="min-w-[140px] h-12 font-semibold shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all duration-200"
            >
              📝 History
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => actions.endGame()}
              className="min-w-[140px] h-12 font-semibold shadow-md hover:shadow-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-200"
            >
              End Game
            </Button>
            
          </div>
        </div>


        {/* Card Distribution Tracking */}
        <CardDistribution key={user?.id} gameState={gameState} />

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