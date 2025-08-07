import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GameTimer } from './GameTimer';
import { ResponsePopup } from './ResponsePopup';
import { PhotoResponsePopup } from './PhotoResponsePopup';
import { PhotoInput } from './PhotoInput';
import { supabase } from '@/integrations/supabase/client';

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

interface AnimatedGameCardProps {
  card: CardData | null;
  gameState: any;
  isMyTurn: boolean;
  isRevealed: boolean;
  onReveal: () => void;
  onComplete: (response?: string | File, caption?: string, timedOut?: boolean) => void;
  onSkip: () => void;
  skipsRemaining: number;
  sessionId: string;
  userId: string;
  onShuffle?: () => void;
}

export const AnimatedGameCard: React.FC<AnimatedGameCardProps> = ({ 
  card, 
  gameState,
  isMyTurn,
  isRevealed, 
  onReveal, 
  onComplete, 
  onSkip, 
  skipsRemaining,
  sessionId,
  userId,
  onShuffle
}) => {
  const [response, setResponse] = useState('');
  const [photoResponse, setPhotoResponse] = useState<File | null>(null);
  const [showResponsePopup, setShowResponsePopup] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const cardSceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check for unseen responses
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
      setShowResponsePopup(true);
    } else {
      setShowResponsePopup(false);
    }
  }, [isMyTurn, hasUnseenResponse]);
    
  const handleDismissPopup = async () => {
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
    }
  };

  const responseAuthorName = 'Partner';

  const handleReveal = () => {
    if (showResponsePopup) return;
    if (isMyTurn && !isRevealed) {
      onReveal();
    }
  };

  const handleComplete = (timedOut = false) => {
    switch (card?.response_type) {
      case 'text':
        onComplete(response, undefined, timedOut);
        break;
      case 'photo':
        onComplete(photoResponse || undefined, undefined, timedOut);
        break;
      case 'action':
      default:
        onComplete(undefined, undefined, timedOut);
        break;
    }
    setResponse('');
    setPhotoResponse(null);
  };

  const handlePhotoSubmit = async (photoUrl: string, caption?: string) => {
    onComplete(photoUrl, caption, false);
    setResponse('');
    setPhotoResponse(null);
  };

  const handleTimerExpire = () => {
    if (isMyTurn) {
      handleComplete(true);
    }
  };

  const handleShuffle = () => {
    if (isShuffling || !onShuffle) return;
    
    setIsShuffling(true);
    
    // If card is flipped, flip it back first
    const cardElement = cardRef.current;
    if (cardElement?.classList.contains('is-flipped')) {
      cardElement.classList.remove('is-flipped');
      setTimeout(() => performShuffleAnimation(), 800);
    } else {
      performShuffleAnimation();
    }
  };

  const performShuffleAnimation = () => {
    if (!cardSceneRef.current || !cardRef.current) return;

    const cardScene = cardSceneRef.current;
    const card = cardRef.current;
    
    // Create temporary deck of cards for animation
    const deck: Array<{el: HTMLElement, xTarget: number, yTarget: number, rTarget: number}> = [];
    const numCardsInDeck = 8;
    
    for (let i = 0; i < numCardsInDeck; i++) {
      const deckCardEl = document.createElement('div');
      deckCardEl.className = 'absolute w-full h-full top-0 left-0 bg-background border-2 border-primary rounded-2xl shadow-lg';
      deckCardEl.style.zIndex = (numCardsInDeck - i).toString();
      deckCardEl.style.willChange = 'transform';
      cardScene.appendChild(deckCardEl);
      
      deck.push({
        el: deckCardEl,
        xTarget: (Math.random() - 0.5) * 250,
        yTarget: (Math.random() - 0.5) * 100,
        rTarget: (Math.random() - 0.5) * 40,
      });
    }
    
    // Hide main card during animation
    card.style.opacity = '0';

    // Animate cards fanning out
    animate({
      duration: 400,
      easing: 'easeOutQuad',
      onProgress: (progress) => {
        deck.forEach(c => {
          const x = progress * c.xTarget;
          const y = progress * c.yTarget;
          const r = progress * c.rTarget;
          c.el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
        });
      },
      onComplete: () => {
        // Animate cards gathering back
        animate({
          duration: 400,
          easing: 'easeInQuad',
          onProgress: (progress) => {
            deck.forEach(c => {
              const x = (1 - progress) * c.xTarget;
              const y = (1 - progress) * c.yTarget;
              const r = (1 - progress) * c.rTarget;
              c.el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
            });
          },
          onComplete: () => {
            // Cleanup
            deck.forEach(c => c.el.remove());
            card.style.opacity = '1';
            setIsShuffling(false);
            
            // Call the shuffle callback
            if (onShuffle) {
              onShuffle();
            }
          }
        });
      }
    });
  };

  // Custom animation helper
  const animate = ({ duration, easing, onProgress, onComplete }: {
    duration: number;
    easing: string;
    onProgress: (progress: number) => void;
    onComplete: () => void;
  }) => {
    const easings: Record<string, (t: number) => number> = {
      easeOutQuad: t => t * (2 - t),
      easeInQuad: t => t * t,
    };
    const ease = easings[easing];
    let start: number | null = null;

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      let progress = Math.min(elapsed / duration, 1);
      
      onProgress(ease(progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        onComplete();
      }
    }
    requestAnimationFrame(step);
  };

  if (!card) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-2xl">
        <p className="text-muted-foreground">No card available</p>
      </div>
    );
  }

  return (
    <>
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

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Animated Card Scene */}
        <div ref={cardSceneRef} className="relative w-[280px] h-[420px] mx-auto" style={{ perspective: '1500px' }}>
          <div 
            ref={cardRef}
            className={`absolute w-full h-full top-0 left-0 transition-transform duration-700 ease-out cursor-pointer z-10 ${
              isRevealed ? 'is-flipped' : ''
            } ${showResponsePopup ? 'opacity-50 pointer-events-none' : ''}`}
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
            onClick={handleReveal}
          >
            {/* Card Back */}
            <div 
              className="absolute w-full h-full bg-primary text-primary-foreground rounded-2xl shadow-xl flex flex-col justify-center items-center p-6"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <svg className="w-16 h-16 mb-5 opacity-90" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50,10 C77.6,10 100,32.4 100,60 C100,87.6 77.6,110 50,110 C37.5,110 26.3,104.5 18.3,96.7 C33.3,85.2 37.1,66.3 28.6,51.4 C20.2,36.4 2.4,32.6 0,50 C0,27.9 22.4,10 50,10 Z"/>
              </svg>
              <div className="text-lg font-semibold tracking-wide">
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
              <div className="absolute bottom-4 left-0 right-0 flex justify-between px-6 text-sm opacity-75">
                <span>{card.category}</span>
                <span>{card.timer_seconds}s</span>
              </div>
            </div>

            {/* Card Front */}
            <div 
              className="absolute w-full h-full bg-card text-card-foreground rounded-2xl shadow-xl flex flex-col justify-end overflow-hidden"
              style={{ 
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              {/* Couple Illustration */}
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 200 280">
                <g className="stroke-current stroke-2 fill-none">
                  <path fill="hsl(var(--accent))" d="M0 280 L 200 280 L 200 100 A 100 100 0 0 0 0 100 Z"/>
                  <circle fill="hsl(var(--primary))" cx="170" cy="80" r="15"/>
                  <g transform="translate(-10, 40)">
                    <path style={{fill: 'hsl(var(--muted-foreground))'}} d="M20,238 V 140 c 0,-15 10,-25 25,-25 h 10"/>
                    <path style={{fill: '#4a312a'}} d="M38,75 C 20,75 15,110 45,112 C 75,115 70,75 52,75 "/>
                    <path style={{fill: '#f2d5b1'}} d="M45,112 c 20,0 25,-40 5,-40 C 30,72 25,112 45,112 Z"/>
                    <path style={{fill: '#4a312a'}} d="M45,112 c -5,5 -5,15 0,18 c 5,3 15,3 20,0 c 5,-5 5,-15 0,-18"/>
                    <path fill="none" d="M48,100 q 2,2 4,0 M62,100 q 2,2 4,0"/>
                  </g>
                  <g transform="translate(10, 40)">
                    <path style={{fill: 'hsl(var(--primary))'}} d="M55,115 C 80,125 110,120 130,105"/>
                    <path style={{fill: 'hsl(var(--primary))'}} d="M180,238 V 140 c 0,-20 -10,-30 -30,-30"/>
                    <path style={{fill: '#b55239'}} d="M125,70 C 110,70 100,120 145,120 C 190,120 180,70 165,70 "/>
                    <path style={{fill: '#e5ab83'}} d="M145,120 c 25,0 30,-40 5,-45 C 120,70 120,120 145,120 Z"/>
                    <path fill="none" d="M138,102 q 2,2 4,0 M152,102 q 2,2 4,0"/>
                  </g>
                </g>
              </svg>
              
              {/* Text overlay with gradient */}
              <div className="relative z-10 bg-gradient-to-t from-card via-card/90 to-transparent p-6 pt-12">
                <p className="text-lg leading-relaxed text-center font-medium">
                  {card.prompt}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shuffle Button */}
        {onShuffle && (
          <div className="flex justify-center">
            <Button
              onClick={handleShuffle}
              disabled={isShuffling}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              {isShuffling ? 'Shuffling...' : 'Shuffle'}
            </Button>
          </div>
        )}

        {/* Game Timer - Show when card is revealed */}
        {isRevealed && (
          <GameTimer
            sessionId={gameState?.id || ''}
            duration={card.timer_seconds}
            isMyTurn={isMyTurn}
            isActive={true}
            cardStartedAt={gameState?.current_card_started_at}
            onTimeUp={handleTimerExpire}
          />
        )}

        {/* Response status if exists and seen */}
        {isRevealed && (gameState?.last_response_text || gameState?.last_response_photo_url) && gameState?.last_response_seen && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <span>✅</span>
              Previous response read successfully
            </p>
          </div>
        )}

        {/* Response Area - Only for active player when card is revealed */}
        {isRevealed && isMyTurn && renderResponseInput()}

        {/* Action Buttons - Only show when popup is not open and card is revealed */}
        {isRevealed && !showResponsePopup && (
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