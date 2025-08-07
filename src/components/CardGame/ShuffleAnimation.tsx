import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';

interface ShuffleAnimationProps {
  onShuffle?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ShuffleAnimation: React.FC<ShuffleAnimationProps> = ({
  onShuffle,
  disabled = false,
  className = ""
}) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const cardSceneRef = useRef<HTMLDivElement>(null);

  const handleShuffle = () => {
    if (isShuffling || disabled) return;
    
    setIsShuffling(true);
    performShuffleAnimation();
    onShuffle?.();
  };

  const performShuffleAnimation = () => {
    if (!cardSceneRef.current) return;

    // Create a temporary deck of cards for the animation
    const deck: Array<{
      el: HTMLDivElement;
      xTarget: number;
      yTarget: number;
      rTarget: number;
    }> = [];
    
    const numCardsInDeck = 8;
    
    for (let i = 0; i < numCardsInDeck; i++) {
      const deckCardEl = document.createElement('div');
      deckCardEl.className = 'absolute w-16 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-lg border-2 border-white/20';
      deckCardEl.style.zIndex = `${numCardsInDeck - i}`;
      deckCardEl.style.top = '50%';
      deckCardEl.style.left = '50%';
      deckCardEl.style.transform = 'translate(-50%, -50%)';
      deckCardEl.style.willChange = 'transform';
      
      // Add a heart emoji to each card
      const heart = document.createElement('div');
      heart.textContent = '💕';
      heart.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg';
      deckCardEl.appendChild(heart);
      
      cardSceneRef.current.appendChild(deckCardEl);
      
      deck.push({
        el: deckCardEl,
        xTarget: (Math.random() - 0.5) * 150, // Spread them out
        yTarget: (Math.random() - 0.5) * 60,
        rTarget: (Math.random() - 0.5) * 30,
      });
    }

    // Animate cards fanning out
    animate({
      duration: 400,
      easing: 'easeOutQuad',
      onProgress: (progress) => {
        deck.forEach(c => {
          const x = progress * c.xTarget;
          const y = progress * c.yTarget;
          const r = progress * c.rTarget;
          c.el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${r}deg)`;
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
              c.el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${r}deg)`;
            });
          },
          onComplete: () => {
            // Cleanup
            deck.forEach(c => c.el.remove());
            setIsShuffling(false);
          }
        });
      }
    });
  };

  // Custom animation helper
  const animate = ({ 
    duration, 
    easing, 
    onProgress, 
    onComplete 
  }: {
    duration: number;
    easing: string;
    onProgress: (progress: number) => void;
    onComplete?: () => void;
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
        onComplete?.();
      }
    }
    requestAnimationFrame(step);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Card scene for animation */}
      <div 
        ref={cardSceneRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1000 }}
      />
      
      {/* Shuffle button */}
      <Button
        onClick={handleShuffle}
        disabled={disabled || isShuffling}
        variant="outline"
        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
      >
        <Shuffle className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
        {isShuffling ? 'Shuffling...' : 'Shuffle'}
      </Button>
    </div>
  );
};