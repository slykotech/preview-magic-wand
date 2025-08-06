import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CardTimer } from './CardTimer';

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
  isRevealed: boolean;
  onReveal: () => void;
  onComplete: (response?: string, reactionTime?: number) => void;
  onSkip: () => void;
  onFavorite: () => void;
  disabled: boolean;
  skipsRemaining: number;
  canInteract: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ 
  card, 
  isRevealed, 
  onReveal, 
  onComplete, 
  onSkip, 
  onFavorite, 
  disabled, 
  skipsRemaining,
  canInteract = true
}) => {
  const [response, setResponse] = useState('');
  const [showTimer, setShowTimer] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [startTime] = useState(Date.now());

  const handleReveal = () => {
    console.log('=== CARD REVEAL CLICKED ===');
    console.log('Current state:', { isRevealed, disabled, canInteract });
    
    onReveal();
    if (canInteract) {
      setShowTimer(true);
    }
  };

  const handleComplete = () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    onComplete(response, timeTaken);
    setResponse('');
    setShowTimer(false);
  };

  const handleTimerExpire = () => {
    setTimeout(() => handleComplete(), 10000);
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 3D Card Animation */}
      <div className="card-scene">
        <div className={`sync-card ${isRevealed ? 'is-flipped' : ''}`}>
          {/* Card Front (Revealed Content) */}
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
                  <span className="stat-label">Timer:</span>
                  <span className="stat-value">{card.timer_seconds}s</span>
                </div>
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
          
          {/* Card Back (Tap to Reveal) */}
          <div 
            className="card-face card-face--back"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Card back clicked!');
              if (!disabled && !isRevealed) {
                handleReveal();
              }
            }}
          >
            <svg className="logo" viewBox="0 0 100 100">
              <path d="M50,10 A40,40 0 0,1 50,90 A20,20 0 0,1 50,50 A20,20 0 0,0 50,10 Z"/>
            </svg>
            <div className="tap-prompt">Tap to Reveal</div>
            
            {/* Category hint on back */}
            <div className="category-hint">
              <span className="category-text">{card.category}</span>
              <span className="timer-text">{card.timer_seconds}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Response Area (if not action-based and revealed) */}
      {!card.requires_action && isRevealed && canInteract && (
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

      {/* Timer and Controls - Only show for active player */}
      {isRevealed && showTimer && canInteract && (
        <div className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <CardTimer 
              seconds={card.timer_seconds}
              onExpire={handleTimerExpire}
              isPaused={timerPaused}
              category={card.timer_category}
            />
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimerPaused(!timerPaused)}
              >
                {timerPaused ? '▶️ Resume' : '⏸️ Pause'}
              </Button>
              
              {card.intimacy_level >= 4 && skipsRemaining > 0 && canInteract && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onSkip}
                >
                  Skip ({skipsRemaining} left)
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleComplete}
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
          </div>
        </div>
      )}

    </div>
  );
};