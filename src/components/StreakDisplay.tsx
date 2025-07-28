import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Heart, Calendar } from 'lucide-react';

interface StreakDisplayProps {
  checkinStreak: number;
  loveStreak: number;
  className?: string;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  checkinStreak, 
  loveStreak, 
  className = '' 
}) => {
  return (
    <Card className={`${className} bg-gradient-romance border-none shadow-elegant`}>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 text-center">
          Love Streaks 💕
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Check-in Streak */}
          <div className="text-center">
            <div className="bg-white/20 rounded-full p-3 mx-auto w-fit mb-2">
              <Calendar className="text-white" size={24} />
            </div>
            <p className="text-2xl font-bold text-white">{checkinStreak}</p>
            <p className="text-sm text-white/80 font-medium">Daily Check-ins</p>
          </div>
          
          {/* Love Streak */}
          <div className="text-center">
            <div className="bg-white/20 rounded-full p-3 mx-auto w-fit mb-2">
              <Flame className="text-white" size={24} />
            </div>
            <p className="text-2xl font-bold text-white">{loveStreak}</p>
            <p className="text-sm text-white/80 font-medium">Love Streak</p>
          </div>
        </div>
        
        {(checkinStreak > 0 || loveStreak > 0) && (
          <div className="mt-4 text-center">
            <p className="text-xs text-white/70">
              {checkinStreak > 7 ? "You're on fire! 🔥" : "Keep it up! 💪"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};