import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GameTimer } from './GameTimer';
import { ResponsePopup } from './ResponsePopup';
import { PhotoResponsePopup } from './PhotoResponsePopup';
import { PhotoInput } from './PhotoInput';
import { DebugInfo } from './DebugInfo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardData {
  id: string;
  category: string;
  subcategory: string;
  prompt: string;
  timer_seconds: number;
  timer_category: string;
  difficulty_level: number;
  intimacy_level: number;
  requires_action: boolean;
  requires_physical_presence: boolean;
  mood_tags: string[];
  relationship_stage: string[];
  response_type: 'action' | 'text' | 'photo';
}

interface GameCardProps {
  card: CardData | null;
  gameState: any;
  isMyTurn: boolean;
  isRevealed: boolean;
  onReveal: () => void;
  onComplete: (response?: string | File, caption?: string, timedOut?: boolean) => void;
  onSkip: () => void;
  onFavorite: () => void;
  skipsRemaining: number;
  sessionId: string;
  userId: string;
  blockAutoAdvance?: boolean;
  setBlockAutoAdvance?: (blocked: boolean) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ 
  card, 
  gameState,
  isMyTurn,
  isRevealed, 
  onReveal, 
  onComplete, 
  onSkip, 
  onFavorite, 
  skipsRemaining,
  sessionId,
  userId,
  blockAutoAdvance: parentBlockAutoAdvance,
  setBlockAutoAdvance: setParentBlockAutoAdvance
}) => {
  const [response, setResponse] = useState('');
  const [photoResponse, setPhotoResponse] = useState<File | null>(null);
  const [showResponsePopup, setShowResponsePopup] = useState(false);
  const [blockAutoAdvance, setBlockAutoAdvance] = useState(false);

  // Check for unseen text or photo responses
  const hasUnseenTextResponse = gameState?.last_response_text && 
                                !gameState?.last_response_seen &&
                                gameState?.last_response_author_id !== userId;
  
  const hasUnseenPhotoResponse = gameState?.last_response_photo_url && 
                                 !gameState?.last_response_seen &&
                                 gameState?.last_response_author_id !== userId;
  
  const hasUnseenResponse = hasUnseenTextResponse || hasUnseenPhotoResponse;

  // Show popup when it's my turn and there's an unseen response
  useEffect(() => {
    if (isMyTurn && hasUnseenResponse) {
      console.log('🎉 Showing response popup for unseen response:', {
        hasUnseenResponse,
        isMyTurn,
        responseText: gameState?.last_response_text
      });
      setShowResponsePopup(true);
    } else {
      setShowResponsePopup(false);
    }
  }, [isMyTurn, hasUnseenResponse]);
    
  const handleDismissPopup = async () => {
    console.log('💬 Dismissing response popup...');
    
    const { error } = await supabase
      .from("card_deck_game_sessions")
      .update({
        last_response_seen: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (error) {
      console.error('❌ Failed to dismiss popup:', error);
    } else {
      setShowResponsePopup(false);
      console.log('✅ Response popup dismissed');
    }
  };

  // Get author name for popup
  const responseAuthorName = gameState?.last_response_author_id === gameState?.user1_id
    ? 'Partner'  // Since we're showing this to the other player
    : 'Partner';

  const handleReveal = () => {
    console.log('=== CARD REVEAL CLICKED ===');
    
    // Block reveal if popup is open
    if (showResponsePopup) {
      console.log('❌ Card reveal blocked - popup is open');
      return;
    }
    
    if (isMyTurn && !isRevealed) {
      onReveal();
    }
  };

  const handleComplete = (timedOut = false) => {
    console.group('🎯 GAMECARD handleComplete');
    console.log('🎯 Called with timedOut:', timedOut);
    console.log('🎯 Card response type:', card?.response_type);
    console.log('🎯 Response data:', { response, photoResponse });
    
    switch (card?.response_type) {
      case 'text':
        console.log('🎯 Calling onComplete for TEXT with timedOut:', timedOut);
        onComplete(response, undefined, timedOut);
        break;
      case 'photo':
        console.log('🎯 Calling onComplete for PHOTO with timedOut:', timedOut);
        onComplete(photoResponse || undefined, undefined, timedOut);
        break;
      case 'action':
      default:
        console.log('🎯 Calling onComplete for ACTION with timedOut:', timedOut);
        onComplete(undefined, undefined, timedOut);
        break;
    }
    console.log('🎯 Clearing response state...');
    setResponse('');
    setPhotoResponse(null);
    console.groupEnd();
  };

  const handlePhotoSubmit = async (photoUrl: string, caption?: string) => {
    onComplete(photoUrl, caption, false);
    setResponse('');
    setPhotoResponse(null);
  };

  const handleTimerExpire = () => {
    console.group('⏰ TIMER EXPIRED IN GAMECARD!');
    console.log('⏰ Timer expired! Handling timeout...');
    console.log('⏰ Current state:', {
      isMyTurn,
      currentUserId: userId,
      gameState: gameState?.id,
      currentCard: card?.id,
      gameUser1: gameState?.user1_id,
      gameUser2: gameState?.user2_id,
      currentTurn: gameState?.current_turn
    });
    
    if (isMyTurn) {
      console.log('⏰ ✅ MY TURN - completing with timeout flag = TRUE');
      console.log('⏰ About to call handleComplete(true)...');
      console.log('⏰ handleComplete function:', handleComplete.toString().substring(0, 100));
      handleComplete(true); // Pass true for timedOut
      console.log('⏰ ✅ handleComplete(true) called successfully');
    } else {
      console.log('⏰ ❌ NOT MY TURN - ignoring timer expiry');
      console.log('⏰ Current turn belongs to:', gameState?.current_turn);
      console.log('⏰ My user ID:', userId);
    }
    console.groupEnd();
  };

  const getCategoryStyle = (category: string) => {
    const styles = {
      romantic: 'bg-pink-100 text-pink-800',
      intimate: 'bg-purple-100 text-purple-800',
      flirty: 'bg-red-100 text-red-800',
      memory: 'bg-blue-100 text-blue-800',
      future: 'bg-green-100 text-green-800',
      funny: 'bg-yellow-100 text-yellow-800',
      spicy: 'bg-orange-100 text-orange-800',
      growth: 'bg-teal-100 text-teal-800',
      daily: 'bg-gray-100 text-gray-800'
    } as const;
    return styles[category as keyof typeof styles] || 'bg-muted';
  };

  if (!card) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-2xl">
        <p className="text-muted-foreground">No card available</p>
      </div>
    );
  }

  // Show card back if not revealed
  if (!isRevealed) {
    return (
      <>
        {/* Debug Info */}
        <DebugInfo
          gameState={gameState}
          currentUserId={userId}
          isMyTurn={isMyTurn}
        />

        {/* Response Popups */}
        {hasUnseenTextResponse && (
          <ResponsePopup
            isOpen={showResponsePopup}
            response={gameState?.last_response_text || ''}
            authorName={responseAuthorName}
            timestamp={gameState?.last_response_timestamp || ''}
            onDismiss={handleDismissPopup}
          />
        )}
        
        {hasUnseenPhotoResponse && (
          <PhotoResponsePopup
            isOpen={showResponsePopup}
            photoUrl={gameState?.last_response_photo_url || ''}
            caption={gameState?.last_response_photo_caption}
            authorName={responseAuthorName}
            timestamp={gameState?.last_response_timestamp || ''}
            onDismiss={handleDismissPopup}
          />
        )}

        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="card-scene">
            <div className="sync-card">
              <div 
                className={`card-face card-face--back ${showResponsePopup ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={handleReveal}
              >
                <svg className="logo" viewBox="0 0 100 100">
                  <path d="M50,10 A40,40 0 0,1 50,90 A20,20 0 0,1 50,50 A20,20 0 0,0 50,10 Z"/>
                </svg>
                <div className="tap-prompt">
                  {!isMyTurn 
                    ? 'Waiting for partner...'
                    : showResponsePopup 
                      ? 'Read the response first!'
                      : 'Tap to Reveal'
                  }
                </div>
                {showResponsePopup && (
                  <p className="text-sm mt-2 opacity-80">
                    Dismiss the popup to continue
                  </p>
                )}
                
                {/* Category hint on back */}
                <div className="category-hint">
                  <span className="category-text">{card.category}</span>
                  <span className="timer-text">{card.timer_seconds}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show revealed card (visible to BOTH players)
  return (
    <>
      {/* Debug Info */}
      <DebugInfo
        gameState={gameState}
        currentUserId={userId}
        isMyTurn={isMyTurn}
      />

      {/* Response Popups */}
      {hasUnseenTextResponse && (
        <ResponsePopup
          isOpen={showResponsePopup}
          response={gameState?.last_response_text || ''}
          authorName={responseAuthorName}
          timestamp={gameState?.last_response_timestamp || ''}
          onDismiss={handleDismissPopup}
        />
      )}
      
      {hasUnseenPhotoResponse && (
        <PhotoResponsePopup
          isOpen={showResponsePopup}
          photoUrl={gameState?.last_response_photo_url || ''}
          caption={gameState?.last_response_photo_caption}
          authorName={responseAuthorName}
          timestamp={gameState?.last_response_timestamp || ''}
          onDismiss={handleDismissPopup}
        />
      )}

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Revealed Card Content */}
        <div className="card-scene">
          <div className={`sync-card is-flipped ${showResponsePopup ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="card-face card-face--front">
              <h2 className="card-title">Today's Sync</h2>
              <p className="card-subtitle">Conversation Starter</p>
              <p className="card-question">
                {card.prompt}
              </p>
              
              {/* Card Details */}
              <div className="card-details">
                <div className="card-badges">
                  <span className={`game-card-badge ${getCategoryStyle(card.category)}`}>
                    {card.category.charAt(0).toUpperCase() + card.category.slice(1)}
                  </span>
                  {card.subcategory && (
                    <span className="game-card-badge game-card-badge-outline">
                      {card.subcategory}
                    </span>
                  )}
                </div>
                
                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-label">Difficulty:</span>
                    <span className="stat-value">{'⭐'.repeat(card.difficulty_level)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Intimacy:</span>
                    <span className="stat-value">{'💕'.repeat(card.intimacy_level)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Timer - Visible to both players */}
        <GameTimer
          sessionId={gameState?.id || ''}
          duration={card.timer_seconds}
          isMyTurn={isMyTurn}
          isActive={true}
          cardStartedAt={gameState?.current_card_started_at}
          onTimeUp={handleTimerExpire}
        />

        {/* Show response status if exists and seen */}
        {(gameState?.last_response_text || gameState?.last_response_photo_url) && gameState?.last_response_seen && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <span>✅</span>
              Previous response read successfully
            </p>
          </div>
        )}

      {/* Response Area - Only for active player */}
      {(() => {
        console.log('💬 Response area render check:', {
          isMyTurn,
          userId,
          currentTurn: gameState?.current_turn,
          userIsCurrentTurn: userId === gameState?.current_turn
        });
        return isMyTurn;
      })() && renderResponseInput()}

        {/* Action Buttons - Only show when popup is not open */}
        {!showResponsePopup && (
          <div className="flex gap-3 justify-center">
            {isMyTurn && (
              <>
                {card.response_type === 'text' ? (
                  <Button
                    onClick={() => handleComplete(false)}
                    disabled={!response.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                    size="lg"
                  >
                    Submit & End Turn
                  </Button>
                ) : card.response_type === 'action' ? (
                  <Button
                    onClick={() => handleComplete(false)}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold"
                    size="lg"
                  >
                    Complete Turn
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleComplete(false)}
                    disabled={false}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 font-semibold"
                    size="lg"
                  >
                    Complete Turn
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={onFavorite}
                  className="text-2xl hover:scale-110 transition p-3"
                >
                  💖
                </Button>
                
                {skipsRemaining > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onSkip}
                  >
                    Skip ({skipsRemaining})
                  </Button>
                )}
              </>
            )}
            
            {/* Waiting message */}
            {!isMyTurn && (
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-purple-700">
                  ⏳ Waiting for partner...
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );

  // Render different input types based on response_type
  function renderResponseInput() {
    if (!isMyTurn) return null;

    switch (card?.response_type) {
      case 'text':
        return (
          <div className="mt-4 space-y-2">
            <label className="text-sm text-muted-foreground">Your Response:</label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your answer here..."
              className="resize-none focus:ring-2 focus:ring-primary"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {response.length}/500 characters
            </p>
          </div>
        );

      case 'photo':
        return (
          <div className="mt-4 space-y-2">
            <label className="text-sm text-muted-foreground">Take or Upload Photo:</label>
            <PhotoInput
              onPhotoSelected={handlePhotoSubmit}
              isSubmitting={false}
            />
          </div>
        );

      case 'action':
      default:
        return (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800 flex items-center">
              <span className="mr-2">⚡</span>
              Complete this action with your partner
            </p>
          </div>
        );
    }
  }
};