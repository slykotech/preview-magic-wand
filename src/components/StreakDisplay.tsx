import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Calendar, Heart, Zap } from 'lucide-react';

interface StreakDisplayProps {
  checkinStreak: number;
  storyStreak: number;
  className?: string;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  checkinStreak, 
  storyStreak, 
  className = '' 
}) => {
  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'from-sunrise-coral to-gold-accent';
    if (streak >= 3) return 'from-secondary to-accent';
    return 'from-muted to-muted-foreground/50';
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 14) return '🔥';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '⭐';
    return '💫';
  };

  return (
    <Card className={`${className} bg-gradient-romance border-none shadow-elegant`}>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 text-center">
          Love Streaks {getStreakEmoji(Math.max(checkinStreak, storyStreak))}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Check-in Streak */}
          <div className="text-center">
            <div className={`bg-gradient-to-br ${getStreakColor(checkinStreak)} rounded-full p-3 mx-auto w-fit mb-2 shadow-elegant`}>
              <Calendar className="text-white" size={24} />
            </div>
            <p className="text-2xl font-bold text-white">{checkinStreak}</p>
            <p className="text-sm text-white/80 font-medium">Daily Check-ins</p>
            {checkinStreak > 0 && (
              <p className="text-xs text-white/60 mt-1">+{Math.min(checkinStreak * 2, 20)} bonus pts</p>
            )}
          </div>
          
          {/* Story Streak */}
          <div className="text-center">
            <div className={`bg-gradient-to-br ${getStreakColor(storyStreak)} rounded-full p-3 mx-auto w-fit mb-2 shadow-elegant`}>
              <Flame className="text-white" size={24} />
            </div>
            <p className="text-2xl font-bold text-white">{storyStreak}</p>
            <p className="text-sm text-white/80 font-medium">Story Streak</p>
            {storyStreak > 0 && (
              <p className="text-xs text-white/60 mt-1">+{Math.min(storyStreak * 2, 20)} bonus pts</p>
            )}
          </div>
        </div>
        
        {(checkinStreak > 0 || storyStreak > 0) && (
          <div className="mt-4 text-center">
            <p className="text-xs text-white/70">
              {Math.max(checkinStreak, storyStreak) >= 14 ? "Legendary streak! 🏆" :
               Math.max(checkinStreak, storyStreak) >= 7 ? "You're on fire! 🔥" : 
               "Keep it up! 💪"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};