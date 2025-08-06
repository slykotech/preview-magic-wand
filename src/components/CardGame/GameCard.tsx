import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SharedTimer } from './SharedTimer';

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
}

interface GameCardProps {
  card: CardData | null;
  gameState: any;
  isMyTurn: boolean;
  isRevealed: boolean;
  onReveal: () => void;
  onComplete: (response?: string, timedOut?: boolean) => void;
  onSkip: () => void;
  onFavorite: () => void;
  skipsRemaining: number;
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
  skipsRemaining
}) => {
  const [response, setResponse] = useState('');

  const handleReveal = () => {
    console.log('=== CARD REVEAL CLICKED ===');
    console.log('Current state:', { isRevealed, isMyTurn });
    
    if (isMyTurn && !isRevealed) {
      onReveal();
    }
  };

  const handleComplete = (timedOut = false) => {
    onComplete(response, timedOut);
    setResponse('');
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
      {!card.requires_action && isMyTurn && (
        <div className="mt-4">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Share your thoughts... (optional)"
            className="resize-none"
            rows={3}
          />
        </div>
      )}

      {/* Action Buttons - Only for active player */}
      {isMyTurn && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => handleComplete(false)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 font-semibold"
            size="lg"
          >
            Complete Turn
          </Button>
          
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

      {/* Waiting message for non-active player */}
      {!isMyTurn && (
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-purple-700">
            👀 Watch your partner complete this challenge!
          </p>
        </div>
      )}

    </div>
  );
};