import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SharedTimer } from './SharedTimer';
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
  const [partnerResponse, setPartnerResponse] = useState<any>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [responseDismissTimer, setResponseDismissTimer] = useState<NodeJS.Timeout | null>(null);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [persistentResponses, setPersistentResponses] = useState<Map<string, any>>(new Map());
  const [blockAutoAdvance, setBlockAutoAdvance] = useState(false);

  // Fetch partner response when card changes and setup real-time subscription
  useEffect(() => {
    if (!card || !sessionId) return;
    
    console.log(`🔍 Setting up response subscription for card ${card.id}, response_type: ${card.response_type}`);
    console.log(`🔄 Card change detected:`, {
      currentCardId,
      newCardId: card.id,
      hasPartnerResponse: !!partnerResponse,
      showResponse,
      willClearResponse: currentCardId && currentCardId !== card.id
    });
    
    // Clear previous response when card changes - responses should only be for current card
    if (currentCardId && currentCardId !== card.id) {
      console.log(`📋 Card changed from ${currentCardId} to ${card.id}, clearing previous response`);
      setPartnerResponse(null);
      setShowResponse(false);
      setPersistentResponses(new Map()); // Clear all stored responses
    }
    setCurrentCardId(card.id);
    
    const fetchPartnerResponse = async () => {
      console.log(`📡 Fetching partner responses for session: ${sessionId}, card: ${card.id}, excluding user: ${userId}`);
      
      const { data, error } = await supabase
        .from('card_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('card_id', card.id)
        .neq('user_id', userId);
      
      if (error) {
        console.error('❌ Error fetching partner responses:', error);
        console.error('Response fetch error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return;
      }
      
      console.log('📨 Fetched partner responses:', data);
      console.log('📋 Current state before processing:', {
        sessionId,
        cardId: card.id,
        userId,
        responseCount: data?.length || 0,
        showResponse,
        partnerResponse: !!partnerResponse,
        currentCardId
      });
      
      if (data && data.length > 0) {
        const latestResponse = data[data.length - 1]; // Get latest response
        console.log('✅ Found partner response:', latestResponse);
        console.log('🎯 Setting partner response state:', {
          responseId: latestResponse.id,
          responseType: latestResponse.response_type,
          responseText: latestResponse.response_text,
          userId: latestResponse.user_id,
          timestamp: latestResponse.responded_at
        });
        
        setPartnerResponse(latestResponse);
        setShowResponse(true);
        console.log('🔥 PARTNER RESPONSE SET - SHOULD BE VISIBLE NOW!');
      } else {
        console.log('📭 No partner responses found for this card');
        // Clear response state when no responses found for current card
        setPartnerResponse(null);
        setShowResponse(false);
      }
    };

    fetchPartnerResponse();

    // Subscribe to ALL responses for this session - not just current card
    // This ensures User 2 sees User 1's response IMMEDIATELY when sent
    const channelName = `session-responses-${sessionId}`;
    console.log(`🔔 Creating session-wide subscription channel: ${channelName}`);
    console.log(`🎯 USER 2 SETUP: Listening for responses from User 1 immediately!`);
    console.log(`📋 Current User ID: ${userId}, Session: ${sessionId}`);
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'card_responses',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('🚨🚨🚨 REAL-TIME EVENT TRIGGERED! 🚨🚨🚨');
          console.log('📡 FULL PAYLOAD:', JSON.stringify(payload, null, 2));
          console.log('📊 Response details:', {
            sessionId: payload.new.session_id,
            cardId: payload.new.card_id,
            userId: payload.new.user_id,
            responseType: payload.new.response_type,
            responseText: payload.new.response_text,
            currentSessionId: sessionId,
            currentCardId: card.id,
            currentUserId: userId,
            isFromPartner: payload.new.user_id !== userId
          });
          
          // Show ONLY responses for the current card
          if (payload.new.session_id === sessionId && 
              payload.new.user_id !== userId &&
              payload.new.card_id === card.id) {
            
            console.log('🚨 SHOWING PARTNER RESPONSE FOR CURRENT CARD!');
            console.log(`📋 Response for card: ${payload.new.card_id}, Current card: ${card.id}`);
            
            // Store in persistent responses map for this card
            setPersistentResponses(prev => {
              const newMap = new Map(prev);
              newMap.set(payload.new.card_id, payload.new);
              console.log('💾 Stored response in persistent map for card:', payload.new.card_id);
              return newMap;
            });
            
            // Show the response only if it's for the current card
            setPartnerResponse(payload.new);
            setShowResponse(true);
            setBlockAutoAdvance(true);
            if (setParentBlockAutoAdvance) setParentBlockAutoAdvance(true); // Block auto-advance until response is dismissed
            console.log('🔥 PARTNER RESPONSE STATE SET FOR CURRENT CARD! Auto-advance BLOCKED.');
            
            // Show toast notification
            const responseTypeText = payload.new.response_type === 'text' ? 'sent a message' : 
                                   payload.new.response_type === 'photo' ? 'shared a photo' : 
                                   'completed the task';
            toast.success(`Partner ${responseTypeText}! 🎉`);
          } else {
            console.log('❌ Response is not for current card or from same user');
            console.log('Details:', {
              sameSession: payload.new.session_id === sessionId,
              differentUser: payload.new.user_id !== userId,
              responseUserId: payload.new.user_id,
              currentUserId: userId,
              responseCardId: payload.new.card_id,
              currentCardId: card.id,
              isCurrentCard: payload.new.card_id === card.id
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${channelName}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription is ACTIVE - User 2 should receive responses immediately!');
        }
      });

    // Disable fallback polling since real-time subscriptions are working
    // The constant polling was causing unnecessary network requests
    // and the real-time subscription handles response detection properly
    
    // Note: If real-time issues occur in production, re-enable this with 
    // proper duplicate detection logic

    return () => {
      console.log(`🧹 Cleaning up subscription for card ${card.id}`);
      supabase.removeChannel(channel);
      if (responseDismissTimer) clearTimeout(responseDismissTimer);
    };
  }, [sessionId, userId]); // Only depend on session and user, NOT card ID

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (responseDismissTimer) clearTimeout(responseDismissTimer);
    };
  }, [responseDismissTimer]);

  const handleReveal = () => {
    console.log('=== CARD REVEAL CLICKED ===');
    console.log('Current state:', { 
      isRevealed, 
      isMyTurn, 
      userId: userId,
      currentTurn: gameState?.current_turn,
      userIsCurrentTurn: userId === gameState?.current_turn
    });
    
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
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="card-scene">
          <div className="sync-card">
            <div 
              className="card-face card-face--back"
              onClick={handleReveal}
            >
              <svg className="logo" viewBox="0 0 100 100">
                <path d="M50,10 A40,40 0 0,1 50,90 A20,20 0 0,1 50,50 A20,20 0 0,0 50,10 Z"/>
              </svg>
              <div className="tap-prompt">
                {isMyTurn ? 'Tap to Reveal' : 'Waiting for reveal...'}
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
    );
  }

  // Show revealed card (visible to BOTH players)
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Revealed Card Content */}
      <div className="card-scene">
        <div className="sync-card is-flipped">
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

      {/* Action Buttons - Only for active player */}
      {(() => {
        console.log('🎯 Button render check:', {
          isMyTurn,
          userId,
          currentTurn: gameState?.current_turn,
          userIsCurrentTurn: userId === gameState?.current_turn,
          cardResponseType: card.response_type
        });
        return isMyTurn;
      })() && (
        <div className="flex gap-3 justify-center">
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
        </div>
      )}

      {/* Current Game Response Display - Real-time shared response from game session */}
      {gameState?.current_card_response && gameState?.current_card_id === card.id && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💬</span>
            <p className="text-sm font-semibold text-purple-700">
              {isMyTurn ? "Your response:" : "Partner's response:"}
            </p>
            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full ml-auto">
              {new Date(gameState.current_card_responded_at).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-lg text-gray-800 italic leading-relaxed">
            "{gameState.current_card_response}"
          </p>
        </div>
      )}

      {/* Partner Response Display - Fixed positioning and styling */}
      {showResponse && partnerResponse && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300 shadow-lg animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-pulse">💬</span>
              <h3 className="font-bold text-green-800">Partner's Response!</h3>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {new Date(partnerResponse.responded_at).toLocaleTimeString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('🎯 Manually dismissing partner response');
                setShowResponse(false);
                setPartnerResponse(null);
                setBlockAutoAdvance(false);
                if (setParentBlockAutoAdvance) setParentBlockAutoAdvance(false); // Unblock auto-advance when dismissed
                console.log('🎯 Response dismissed - auto-advance UNBLOCKED');
                if (responseDismissTimer) clearTimeout(responseDismissTimer);
              }}
              className="text-green-600 hover:text-green-800 h-8 w-8 p-0 hover:bg-green-100 rounded-full"
            >
              ✕
            </Button>
          </div>
          
          {/* Text Response */}
          {partnerResponse.response_type === 'text' && partnerResponse.response_text && (
            <div className="bg-white p-4 rounded-md border border-green-100 shadow-sm">
              <p className="text-green-800 font-medium whitespace-pre-wrap text-sm leading-relaxed">
                "{partnerResponse.response_text}"
              </p>
              <div className="mt-3 text-xs text-green-600 text-center">
                <span>Click × to close</span>
              </div>
            </div>
          )}
          
          {/* Photo Response */}
          {partnerResponse.response_type === 'photo' && partnerResponse.response_text && (
            <div className="bg-white p-2 rounded-md border border-green-100">
              <img
                src={`${supabase.storage.from('card-responses').getPublicUrl(partnerResponse.response_text).data.publicUrl}`}
                alt="Partner's response"
                className="max-h-48 w-full object-contain rounded"
              />
              <div className="mt-2 text-xs text-green-600 text-center">
                📸 Partner shared a photo
              </div>
            </div>
          )}
          
          {/* Action Response */}
          {partnerResponse.response_type === 'action' && (
            <div className="bg-white p-3 rounded-md border border-green-100 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">Task Completed!</p>
                <p className="text-sm text-green-600">Your partner finished the action</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waiting message for non-active player */}
      {!isMyTurn && !showResponse && (
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-purple-700">
            👀 Watch your partner complete this challenge!
          </p>
        </div>
      )}

    </div>
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