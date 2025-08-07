import React, { useState, useEffect } from 'react';

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
  
  useEffect(() => {
    setTimeLeft(seconds);
    setHasExpired(false);
  }, [seconds]);
  
  useEffect(() => {
    if (isPaused || timeLeft <= 0 || !isMyTurn) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!hasExpired) {
            setHasExpired(true);
            onExpire(); // This will mark task as failed
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onExpire, hasExpired, isMyTurn]);
  
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };
  
  const getTimerColor = () => {
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
  
  if (timeLeft <= 0) {
    return (
      <div className="text-center p-3 rounded-lg bg-destructive/10">
        <div className="text-destructive font-bold text-xl animate-pulse">
          ⏰ Time's Up! Task Failed
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">{getCategoryIcon()}</span>
        <span className={`text-3xl font-bold ${getTimerColor()}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      {/* Warning when time is running out */}
      {timeLeft <= 10 && timeLeft > 0 && isMyTurn && (
        <p className="text-sm text-destructive mt-1 animate-pulse">
          Hurry! Complete the task!
        </p>
      )}
    </div>
  );
};