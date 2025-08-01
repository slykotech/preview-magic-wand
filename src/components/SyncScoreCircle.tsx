import React, { useEffect, useState } from "react";
import { Heart } from 'lucide-react';

interface SyncScoreCircleProps {
  score: number;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const SyncScoreCircle = ({ 
  score, 
  animated = true, 
  size = 'md',
  showLabel = true 
}: SyncScoreCircleProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  
  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { container: 'w-20 h-20', text: 'text-lg', subtext: 'text-xs', heart: 'w-3 h-3', radius: 32 };
      case 'lg':
        return { container: 'w-40 h-40', text: 'text-4xl', subtext: 'text-sm', heart: 'w-6 h-6', radius: 76 };
      default:
        return { container: 'w-32 h-32', text: 'text-3xl', subtext: 'text-xs', heart: 'w-4 h-4', radius: 60 };
    }
  };

  const config = getSizeConfig();
  const { radius } = config;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayScore(score);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDisplayScore(score);
    }
  }, [score, animated]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "stroke-green-500 text-green-500";
    if (score >= 50) return "stroke-orange-500 text-orange-500";
    return "stroke-red-500 text-red-500";
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return '💚 Healthy';
    if (score >= 50) return '🧡 Moderate';
    return '❤️ Needs Work';
  };

  const scoreColorClass = getScoreColor(displayScore);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative ${config.container} mx-auto`}>
        <svg
          className="transform -rotate-90 w-full h-full"
          viewBox="0 0 144 144"
        >
          {/* Background circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted-foreground/20"
          />
          {/* Progress circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`${scoreColorClass.split(' ')[0]} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.text} font-bold font-poppins ${scoreColorClass.split(' ')[1]}`}>
            {Math.round(displayScore)}%
          </span>
          <Heart className={`${config.heart} ${scoreColorClass.split(' ')[1]} animate-pulse`} />
        </div>
        
        {/* Glow effect for high scores */}
        {displayScore >= 80 && (
          <div className="absolute inset-0 rounded-full bg-gradient-glow animate-pulse opacity-30"></div>
        )}
      </div>
      
      {showLabel && (
        <div className="text-center">
          <span className={`${config.subtext} font-inter text-muted-foreground block`}>
            Love Sync Score
          </span>
          <span className={`${config.subtext} font-inter text-muted-foreground/80`}>
            {getHealthStatus(displayScore)}
          </span>
        </div>
      )}
    </div>
  );
};