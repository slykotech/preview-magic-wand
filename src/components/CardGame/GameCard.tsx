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
}

export const GameCard: React.FC<GameCardProps> = ({ 
  card, 
  isRevealed, 
  onReveal, 
  onComplete, 
  onSkip, 
  onFavorite, 
  disabled, 
  skipsRemaining 
}) => {
  const [response, setResponse] = useState('');
  const [showTimer, setShowTimer] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [startTime] = useState(Date.now());

  const handleReveal = () => {
    if (!disabled) {
      onReveal();
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
    // Give 10 extra seconds to wrap up
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Debug info - remove after fixing */}
      <div className="text-xs bg-gray-100 p-2 rounded">
        Card ID: {card?.id || 'No card'}
        <br />
        Card Prompt: {card?.prompt || 'No prompt'}
        <br />
        Revealed: {isRevealed ? 'Yes' : 'No'}
        <br />
        Disabled: {disabled ? 'Yes' : 'No'}
        <br />
        Show Timer: {showTimer ? 'Yes' : 'No'}
      </div>

      {/* Card Flip Container */}
      <div className="relative h-96">
        <div 
          className={`absolute inset-0 transform-gpu transition-transform duration-700 preserve-3d ${
            isRevealed ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Back */}
          <div 
            className="absolute inset-0 backface-hidden cursor-pointer rounded-2xl"
            onClick={handleReveal}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="h-full bg-gradient-to-br from-primary to-purple-500 rounded-2xl shadow-xl flex items-center justify-center">
              <div className="text-primary-foreground text-center">
                <span className="text-8xl mb-4 block">💕</span>
                <p className="text-2xl font-semibold">Tap to Reveal</p>
                {card && !isRevealed && (
                  <div className="mt-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/20">
                      {card.timer_category === 'quick' && '⚡ Quick'}
                      {card.timer_category === 'standard' && '⏱️ Standard'}
                      {card.timer_category === 'deep' && '🌊 Deep'}
                      {card.timer_category === 'action' && '🎬 Action'}
                      {' • '}
                      {card.timer_seconds < 60 
                        ? `${card.timer_seconds}s` 
                        : `${Math.floor(card.timer_seconds / 60)}min`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Front */}
          <div 
            className="absolute inset-0 rounded-2xl"
            style={{ 
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="h-full bg-card rounded-2xl shadow-xl p-6 flex flex-col">
              {card && (
                <>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getCategoryStyle(card.category)
                    }`}>
                      {card.category.charAt(0).toUpperCase() + card.category.slice(1)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onFavorite}
                      className="text-2xl hover:scale-110 transition p-2"
                    >
                      💖
                    </Button>
                  </div>

                  {/* Difficulty & Intimacy Indicators */}
                  <div className="flex justify-between text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <span>Difficulty:</span>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < card.difficulty_level ? 'text-warning' : 'text-muted-foreground'}>
                          ★
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>Intimacy:</span>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < card.intimacy_level ? 'text-destructive' : 'text-muted-foreground'}>
                          ♥
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="flex-1 flex items-center justify-center px-4">
                    <p className="text-xl text-center leading-relaxed text-foreground">
                      {card.prompt}
                    </p>
                  </div>

                  {/* Action Required Badge */}
                  {card.requires_action && (
                    <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                      <p className="text-sm text-warning-foreground flex items-center">
                        <span className="mr-2">⚡</span>
                        This card requires an action!
                      </p>
                    </div>
                  )}

                  {/* Response Area (if not action-based) */}
                  {!card.requires_action && isRevealed && (
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

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.mood_tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-muted rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timer and Controls */}
      {isRevealed && card && showTimer && (
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
              
              {card.intimacy_level >= 4 && skipsRemaining > 0 && (
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
          </div>
        </div>
      )}
    </div>
  );
};