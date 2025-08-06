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
  userId
}) => {
  const [response, setResponse] = useState('');
  const [photoResponse, setPhotoResponse] = useState<File | null>(null);
  const [partnerResponse, setPartnerResponse] = useState<any>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [responseDismissTimer, setResponseDismissTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch partner response when card changes and setup real-time subscription
  useEffect(() => {
    if (!card || !sessionId) return;
    
    console.log(`🔍 Setting up response subscription for card ${card.id}`);
    
    const fetchPartnerResponse = async () => {
      const { data, error } = await supabase
        .from('card_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('card_id', card.id)
        .neq('user_id', userId);
      
      console.log('📨 Fetched partner responses:', data);
      
      if (data && data.length > 0) {
        const latestResponse = data[0];
        setPartnerResponse(latestResponse);
        setShowResponse(true);
        
        // Auto-dismiss after 10 seconds
        if (responseDismissTimer) clearTimeout(responseDismissTimer);
        const timer = setTimeout(() => {
          setShowResponse(false);
        }, 10000);
        setResponseDismissTimer(timer);
      }
    };

    fetchPartnerResponse();

    // Subscribe to new responses for this specific card
    const channel = supabase
      .channel(`card-responses-${sessionId}-${card.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'card_responses',
          filter: `session_id=eq.${sessionId},card_id=eq.${card.id}`
        }, 
        (payload) => {
          console.log('🎉 New response received:', payload);
          if (payload.new.user_id !== userId) {
            setPartnerResponse(payload.new);
            setShowResponse(true);
            
            // Auto-dismiss after 10 seconds
            if (responseDismissTimer) clearTimeout(responseDismissTimer);
            const timer = setTimeout(() => {
              setShowResponse(false);
            }, 10000);
            setResponseDismissTimer(timer);
            
            // Show toast notification
            toast.success("Partner completed the task! 🎉");
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🧹 Cleaning up subscription for card ${card.id}`);
      supabase.removeChannel(channel);
      if (responseDismissTimer) clearTimeout(responseDismissTimer);
    };
  }, [card?.id, sessionId, userId, responseDismissTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (responseDismissTimer) clearTimeout(responseDismissTimer);
    };
  }, [responseDismissTimer]);

  const handleReveal = () => {
    console.log('=== CARD REVEAL CLICKED ===');
    console.log('Current state:', { isRevealed, isMyTurn });
    
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
      {isMyTurn && renderResponseInput()}

      {/* Action Buttons - Only for active player */}
      {isMyTurn && (
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

      {/* Partner Response Display */}
      {showResponse && partnerResponse && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <h3 className="font-semibold text-green-800">Partner's Response:</h3>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {new Date(partnerResponse.responded_at).toLocaleTimeString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowResponse(false);
                if (responseDismissTimer) clearTimeout(responseDismissTimer);
              }}
              className="text-green-600 hover:text-green-800 h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
          {partnerResponse.response_type === 'text' && (
          <div className="bg-white p-3 rounded-md border border-green-100">
            <p className="text-green-700 whitespace-pre-wrap">{partnerResponse.response_text}</p>
            <div className="mt-2 text-xs text-green-600">
              Auto-dismiss in 10s
            </div>
          </div>
          )}
          {partnerResponse.response_type === 'photo' && (
            <div className="mt-2">
              <img
                src={`${supabase.storage.from('card-responses').getPublicUrl(partnerResponse.response_text).data.publicUrl}`}
                alt="Partner's response"
                className="max-h-60 rounded-lg border shadow-sm"
              />
            </div>
          )}
          {partnerResponse.response_type === 'action' && (
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-xl">✅</span>
              <p className="font-medium">Completed the action successfully!</p>
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