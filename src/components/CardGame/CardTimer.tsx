import React, { useState, useEffect, useRef } from 'react';

interface CardTimerProps {
  seconds: number;
  onExpire: () => void;
  isPaused: boolean;
  category: string;
  isMyTurn: boolean;
}

export const CardTimer: React.FC<CardTimerProps> = ({ 
  seconds, 
  onExpire, 
  isPaused, 
  category,
  isMyTurn 
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [hasExpired, setHasExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setTimeLeft(seconds);
    setHasExpired(false);
  }, [seconds]);
  
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Don't start timer if paused, time is up, not my turn, or already expired
    if (isPaused || timeLeft <= 0 || !isMyTurn || hasExpired) {
      return;
    }
    
    console.log('⏰ Starting timer countdown...', { timeLeft, isMyTurn, hasExpired });
    
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        console.log('⏰ Timer tick:', { prev, newTime, isMyTurn, hasExpired });
        
        // When timer reaches 0 and it's my turn and haven't expired yet
        if (newTime <= 0 && isMyTurn && !hasExpired) {
          console.log('⏰ Timer expired! Calling onExpire...');
          setHasExpired(true);
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          
          // Call onExpire after a small delay to ensure state is updated
          setTimeout(() => {
            console.log('⏰ Executing onExpire callback');
            onExpire();
          }, 100);
          
          return 0;
        }
        
        return Math.max(0, newTime);
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timeLeft, isPaused, onExpire, hasExpired, isMyTurn]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };
  
  const getTimerColor = () => {
    if (hasExpired || timeLeft <= 0) return 'text-destructive animate-pulse';
    
    const percentage = (timeLeft / seconds) * 100;
    if (percentage > 50) return 'text-success';
    if (percentage > 25) return 'text-warning';
    if (percentage > 10) return 'text-orange-500';
    return 'text-destructive animate-pulse';
  };

  const getCategoryIcon = () => {
    const icons = {
      quick: '⚡',
      standard: '⏱️',
      deep: '🌊',
      action: '🎬'
    } as const;
    return icons[category as keyof typeof icons] || '⏱️';
  };
  
  if (hasExpired || timeLeft <= 0) {
    return (
      <div className="text-center p-3 rounded-lg bg-destructive/10">
        <div className="text-destructive font-bold text-xl animate-pulse">
          ⏰ Time's Up! Task Failed
        </div>
        {isMyTurn && (
          <p className="text-sm text-destructive mt-1">
            Your task was not completed in time
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">{getCategoryIcon()}</span>
        <span className={`text-2xl font-bold ${getTimerColor()}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      {/* Warning when time is running out */}
      {timeLeft <= 10 && timeLeft > 0 && isMyTurn && (
        <p className="text-sm text-destructive mt-1 animate-pulse">
          Hurry! Complete the task!
        </p>
      )}
      
      {/* Debug info - remove in production */}
      <div className="text-xs text-muted-foreground mt-2">
        Debug: {timeLeft}s | MyTurn: {isMyTurn ? 'Yes' : 'No'} | Expired: {hasExpired ? 'Yes' : 'No'}
      </div>
    </div>
  );
};