import { useEffect, useState } from "react";

interface SyncScoreCircleProps {
  score: number;
  animated?: boolean;
}

export const SyncScoreCircle = ({ score, animated = true }: SyncScoreCircleProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 60;
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
    if (score >= 80) return "stroke-accent";
    if (score >= 60) return "stroke-secondary";
    return "stroke-muted-foreground";
  };

  return (
    <div className="relative w-32 h-32 mx-auto">
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
          className="text-muted"
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
          className={`${getScoreColor(displayScore)} transition-all duration-1000 ease-out`}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-poppins text-foreground">
          {Math.round(displayScore)}%
        </span>
        <span className="text-xs font-inter text-muted-foreground">
          Sync Score
        </span>
      </div>
      
      {/* Glow effect for high scores */}
      {displayScore >= 80 && (
        <div className="absolute inset-0 rounded-full bg-gradient-glow animate-pulse"></div>
      )}
    </div>
  );
};