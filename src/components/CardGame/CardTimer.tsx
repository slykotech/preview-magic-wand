import React, { useState, useEffect } from 'react';

interface CardTimerProps {
  seconds: number;
  onExpire: () => void;
  isPaused: boolean;
  category: string;
}

export const CardTimer: React.FC<CardTimerProps> = ({ 
  seconds, 
  onExpire, 
  isPaused, 
  category 
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  
  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);
  
  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onExpire]);
  
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };
  
  const getTimerColor = () => {
    const percentage = (timeLeft / seconds) * 100;
    if (percentage > 50) return 'text-success';
    if (percentage > 25) return 'text-warning';
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
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl">{getCategoryIcon()}</span>
      <span className={`text-2xl font-bold ${getTimerColor()}`}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
};