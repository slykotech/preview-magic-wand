import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface MoodBitmojiProps {
  mood: string;
  size?: 'sm' | 'md' | 'lg';
  isPartner?: boolean;
}

const moodEmojis: Record<string, string> = {
  happy: '😊',
  excited: '🤗',
  love: '😍',
  content: '😌',
  neutral: '😐',
  tired: '😴',
  stressed: '😰',
  sad: '😢',
  angry: '😠',
  romantic: '🥰'
};

const getMoodColor = (mood: string) => {
  switch (mood) {
    case 'happy':
    case 'excited':
    case 'love':
    case 'romantic':
      return 'bg-gradient-to-br from-sunrise-coral to-gold-accent';
    case 'content':
    case 'neutral':
      return 'bg-gradient-to-br from-soft-cloud to-muted';
    case 'tired':
    case 'stressed':
      return 'bg-gradient-to-br from-muted to-muted-foreground/50';
    case 'sad':
    case 'angry':
      return 'bg-gradient-to-br from-muted-foreground/30 to-muted';
    default:
      return 'bg-gradient-to-br from-soft-cloud to-background';
  }
};

export const MoodBitmoji: React.FC<MoodBitmojiProps> = ({ 
  mood, 
  size = 'md',
  isPartner = false 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`${sizeClasses[size]} ${getMoodColor(mood)} rounded-full flex items-center justify-center shadow-elegant animate-pulse`}>
        <span className={`${textSizes[size]}`}>
          {moodEmojis[mood] || '😐'}
        </span>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground capitalize">
          {isPartner ? 'Partner' : 'You'}
        </p>
        <p className="text-sm font-semibold text-foreground capitalize">
          {mood}
        </p>
      </div>
    </div>
  );
};