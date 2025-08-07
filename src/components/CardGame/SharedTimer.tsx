import React, { useState, useEffect } from 'react';

interface SharedTimerProps {
  startTime: string | null;
  duration: number;
  onExpire: () => void;
  isActive: boolean;
}

export const SharedTimer: React.FC<SharedTimerProps> = ({ 
  startTime, 
  duration, 
  onExpire,
  isActive 
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    if (!startTime || !isActive) {
      setTimeLeft(duration);
      setTimerExpired(false);
      return;
    }

    const startTimeMs = new Date(startTime).getTime();
    const now = Date.now();
    const timerDuration = duration * 1000;
    
    // Check for invalid/future timestamps
    if (startTimeMs > now) {
      console.warn('⚠️ WARNING: Start time is in the future!', {
        startTime,
        startTimeMs,
        now,
        difference: (startTimeMs - now) / 1000
      });
      // If timestamp is in future, treat as just started
      const correctedStartTime = new Date().toISOString();
      console.log('⏰ Using corrected start time:', correctedStartTime);
      setTimeLeft(duration);
      setTimerExpired(false);
      return;
    }
    
    const calculateTimeLeft = () => {
      const currentNow = Date.now();
      const elapsed = currentNow - startTimeMs;
      const remaining = Math.max(0, timerDuration - elapsed);
      
      // Only log debug info if remaining time is reasonable
      if (remaining <= timerDuration && elapsed >= 0) {
        console.log('⏰ Timer calculation debug:', {
          startTime,
          startTimeMs,
          now: currentNow,
          elapsed: elapsed / 1000,
          remaining: remaining / 1000,
          duration
        });
      }
      
      return Math.floor(remaining / 1000);
    };

    // Set initial time
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    if (initialTimeLeft === 0 && !timerExpired) {
      console.log('⏰ SharedTimer already expired on initialization');
      console.log('⏰ Start time:', startTime);
      console.log('⏰ Duration:', duration);
      console.log('⏰ Calling onExpire from initialization...');
      setTimerExpired(true);
      setTimeout(() => {
        console.log('⏰ EXECUTING onExpire from initialization');
        console.log('⏰ onExpire function:', onExpire.toString().substring(0, 100));
        onExpire();
      }, 100);
      return;
    }

    // Update timer every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining === 0 && !timerExpired) {
        console.log('⏰ SharedTimer expired during countdown');
        console.log('⏰ Remaining time:', remaining);
        console.log('⏰ Timer expired state:', timerExpired);
        console.log('⏰ Calling onExpire from countdown...');
        setTimerExpired(true);
        setTimeout(() => {
          console.log('⏰ EXECUTING onExpire from countdown');
          console.log('⏰ onExpire function:', onExpire.toString().substring(0, 100));
          onExpire();
        }, 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, onExpire, timerExpired, isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage > 50) return 'text-success';
    if (percentage > 25) return 'text-warning';
    return 'text-destructive';
  };

  if (timerExpired || timeLeft <= 0) {
    return (
      <div className="text-center p-3 rounded-lg bg-destructive/10">
        <p className="text-destructive font-semibold text-xl animate-pulse">⏰ Time's Up!</p>
        <p className="text-sm text-destructive mt-1">Task failed due to timeout</p>
      </div>
    );
  }

  return (
    <div className="text-center p-3 rounded-lg bg-muted">
      <p className={`text-2xl font-bold ${getTimerColor()}`}>
        ⏱️ {formatTime(timeLeft)}
      </p>
      {timeLeft <= 10 && (
        <p className="text-sm text-destructive mt-1 animate-pulse">
          ⚠️ Time running out!
        </p>
      )}
      {/* Debug info */}
      <div className="text-xs text-muted-foreground mt-2">
        Timer: {formatTime(timeLeft)} | Expired: {timerExpired ? 'Yes' : 'No'}
      </div>
    </div>
  );
};