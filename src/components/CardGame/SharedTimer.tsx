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
    const timerDuration = duration * 1000;
    
    const calculateTimeLeft = () => {
      const now = Date.now();
      const elapsed = now - startTimeMs;
      const remaining = Math.max(0, timerDuration - elapsed);
      return Math.floor(remaining / 1000);
    };

    // Set initial time
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    if (initialTimeLeft === 0 && !timerExpired) {
      console.log('⏰ SharedTimer already expired on initialization');
      setTimerExpired(true);
      setTimeout(() => onExpire(), 100);
      return;
    }

    // Update timer every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining === 0 && !timerExpired) {
        console.log('⏰ SharedTimer expired during countdown');
        setTimerExpired(true);
        setTimeout(() => onExpire(), 100);
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