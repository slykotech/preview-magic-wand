import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SharedTimer } from './SharedTimer';
import { ResponsePopup } from './ResponsePopup';
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
  onComplete: (response?: string | File, timedOut?: boolean) => void;
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

  // Check if current user has dismissed the popup
  const isUser1 = userId === gameState?.user1_id;
  const hasDismissed = isUser1 
    ? gameState?.response_dismissed_by_user1 
    : gameState?.response_dismissed_by_user2;
  
  const hasResponse = !!gameState?.current_card_response;
  const bothDismissed = gameState?.response_dismissed_by_user1 && gameState?.response_dismissed_by_user2;

  // Show popup when there's a new response and user hasn't dismissed it
  useEffect(() => {
    if (hasResponse && !hasDismissed && gameState?.current_card_id === card?.id) {
      console.log('🎉 Showing response popup:', {
        hasResponse,
        hasDismissed,
        cardMatch: gameState?.current_card_id === card?.id
      });
      setShowResponsePopup(true);
    } else {
      setShowResponsePopup(false);
    }
  }, [hasResponse, hasDismissed, gameState?.current_card_id, card?.id]);
    
  const handleDismissPopup = async () => {
    console.log('💬 Dismissing response popup...');
    
    const dismissField = isUser1 
      ? 'response_dismissed_by_user1' 
      : 'response_dismissed_by_user2';
    
    const { error } = await supabase
      .from("card_deck_game_sessions")
      .update({
        [dismissField]: true,
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
    switch (card?.response_type) {
      case 'text':
        onComplete(response, timedOut);
        break;
      case 'photo':
        onComplete(photoResponse || undefined, timedOut);
        break;
      case 'action':
      default:
        onComplete(undefined, timedOut);
        break;
    }
    setResponse('');
    setPhotoResponse(null);
  };

  const handleTimerExpire = () => {
    if (isMyTurn) {
      handleComplete(true);
    }
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
        {/* Response Popup */}
        <ResponsePopup
          isOpen={showResponsePopup}
          response={gameState?.current_card_response || ''}
          authorName={gameState?.current_turn !== userId ? 'You' : 'Partner'}
          timestamp={gameState?.current_card_responded_at || ''}
          isMyResponse={gameState?.current_turn !== userId}
          onDismiss={handleDismissPopup}
        />

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
                  {isMyTurn && !showResponsePopup ? 'Tap to Reveal' : 'Waiting for reveal...'}
                </div>
                
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
      {/* Response Popup */}
      <ResponsePopup
        isOpen={showResponsePopup}
        response={gameState?.current_card_response || ''}
        authorName={gameState?.current_turn !== userId ? 'You' : 'Partner'}
        timestamp={gameState?.current_card_responded_at || ''}
        isMyResponse={gameState?.current_turn !== userId}
        onDismiss={handleDismissPopup}
      />

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

        {/* Shared Timer - Visible to both players */}
        <SharedTimer 
          startTime={gameState?.current_card_started_at}
          duration={card.timer_seconds}
          onExpire={handleTimerExpire}
          isActive={true}
        />

        {/* Show response status if exists and both dismissed */}
        {hasResponse && bothDismissed && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <span>✅</span>
              Response submitted and read by both players
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
                {/* Show complete button only after response is read by both or for action cards */}
                {((hasResponse && bothDismissed) || card.response_type === 'action') && (
                  <Button
                    onClick={() => handleComplete(false)}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold"
                    size="lg"
                  >
                    Complete Turn
                  </Button>
                )}
                
                {/* Show regular action buttons only if no response yet */}
                {!hasResponse && (
                  <>
                    {card.response_type === 'action' ? (
                      <Button
                        onClick={() => handleComplete(false)}
                        className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 font-semibold"
                        size="lg"
                      >
                        Mark Complete
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleComplete(false)}
                        disabled={
                          (card.response_type === 'text' && !response.trim()) ||
                          (card.response_type === 'photo' && !photoResponse)
                        }
                        className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 font-semibold"
                        size="lg"
                      >
                        Send Response
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
              </>
            )}
            
            {/* Waiting messages */}
            {!isMyTurn && !hasResponse && (
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-purple-700">
                  ⏳ Waiting for partner to respond...
                </p>
              </div>
            )}
            
            {/* Waiting for dismissals */}
            {hasResponse && !bothDismissed && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-700">
                  📖 Waiting for both players to read the response...
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
            <label className="text-sm text-muted-foreground">Upload Photo:</label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoResponse(e.target.files?.[0] || null)}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                {photoResponse ? (
                  <>
                    <img
                      src={URL.createObjectURL(photoResponse)}
                      alt="Response"
                      className="max-h-40 rounded"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to change photo
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl mb-2">📷</span>
                    <p className="text-sm text-muted-foreground">
                      Tap to take photo or upload
                    </p>
                  </>
                )}
              </label>
            </div>
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