import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface GameTimerProps {
  sessionId: string;
  duration: number;
  isMyTurn: boolean;
  isActive: boolean;
  cardStartedAt: string | null;
  onTimeUp: () => void;
}

export const GameTimer: React.FC<GameTimerProps> = ({
  sessionId,
  duration,
  isMyTurn,
  isActive,
  cardStartedAt,
  onTimeUp
}) => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasExpired, setHasExpired] = useState(false);

  // Simple timer expiration handler
  const handleTimerExpire = useCallback(async () => {
    if (!isMyTurn || !user || hasExpired) return;

    console.log('🚨 Timer expired! Handling failed task...');
    setHasExpired(true);

    try {
      // Call dedicated edge function to handle timer expiration
      const { error } = await supabase.functions.invoke('handle-timer-expiration', {
        body: {
          sessionId,
          userId: user.id
        }
      });

      if (error) {
        console.error('Error handling timer expiration:', error);
        throw error;
      }

      // Show immediate feedback
      toast({
        title: "Time's Up!",
        description: "Task failed due to timeout",
        variant: "destructive"
      });

      // Notify parent component
      onTimeUp();

    } catch (error) {
      console.error('Failed to handle timer expiration:', error);
      toast({
        title: "Error",
        description: "Failed to process timeout. Please try again.",
        variant: "destructive"
      });
    }
  }, [sessionId, user, isMyTurn, hasExpired, onTimeUp]);

  // Timer countdown logic
  useEffect(() => {
    if (!isActive || !cardStartedAt) {
      setTimeLeft(duration);
      setHasExpired(false);
      return;
    }

    const startTime = new Date(cardStartedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = Math.max(0, duration - elapsed);

    setTimeLeft(remaining);

    if (remaining === 0 && !hasExpired) {
      handleTimerExpire();
      return;
    }

    const interval = setInterval(() => {
      const currentNow = Date.now();
      const currentElapsed = Math.floor((currentNow - startTime) / 1000);
      const currentRemaining = Math.max(0, duration - currentElapsed);
      
      setTimeLeft(currentRemaining);
      
      if (currentRemaining === 0 && !hasExpired) {
        handleTimerExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cardStartedAt, duration, isActive, hasExpired, handleTimerExpire]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (mins > 0) {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `00:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getTimerColor = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage > 50) return 'text-success';
    if (percentage > 25) return 'text-warning';
    return 'text-destructive';
  };

  if (hasExpired || timeLeft <= 0) {
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
    </div>
  );
};