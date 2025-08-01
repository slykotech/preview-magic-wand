import React from 'react';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RelationshipHealthScoreProps {
  syncScore: number;
  memoryScore: number;
  datePlanScore: number;
  trend: 'up' | 'down' | 'stable';
  className?: string;
}

export const RelationshipHealthScore: React.FC<RelationshipHealthScoreProps> = ({
  syncScore,
  memoryScore,
  datePlanScore,
  trend,
  className = '',
}) => {
  // Calculate weighted average: sync_score (40%) + memory_score (30%) + dateplan_score (30%)
  const healthScore = Math.round(
    (syncScore * 0.4) + (memoryScore * 0.3) + (datePlanScore * 0.3)
  );

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: 'Healthy', emoji: '💚', description: 'Your relationship is thriving!' };
    if (score >= 50) return { status: 'Moderate', emoji: '🧡', description: 'Room for improvement in your connection.' };
    return { status: 'Needs Work', emoji: '❤️', description: 'Focus on strengthening your bond.' };
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'up':
        return 'Improving';
      case 'down':
        return 'Declining';
      default:
        return 'Stable';
    }
  };

  const healthInfo = getHealthStatus(healthScore);
  const colorClass = getHealthColor(healthScore);

  return (
    <Card className={`${className} bg-gradient-to-br from-background to-muted/20 border-none shadow-elegant`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Heart className="w-5 h-5 text-primary animate-pulse" />
          Relationship Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${colorClass} mb-1`}>
            {healthScore}%
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {getTrendIcon()}
            <span>{getTrendText()}</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="text-center p-3 bg-muted/20 rounded-lg">
          <div className="text-lg mb-1">
            {healthInfo.emoji} {healthInfo.status}
          </div>
          <p className="text-sm text-muted-foreground">
            {healthInfo.description}
          </p>
        </div>

        {/* Component Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground mb-2">Score Breakdown:</h4>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Love Sync (40%)</span>
            <span className={`text-sm font-semibold ${getHealthColor(syncScore)}`}>
              {syncScore}%
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Memory Activity (30%)</span>
            <span className={`text-sm font-semibold ${getHealthColor(memoryScore)}`}>
              {memoryScore}%
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Date Completion (30%)</span>
            <span className={`text-sm font-semibold ${getHealthColor(datePlanScore)}`}>
              {datePlanScore}%
            </span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2">
          {[
            { label: 'Sync', score: syncScore, weight: 40 },
            { label: 'Memory', score: memoryScore, weight: 30 },
            { label: 'Dates', score: datePlanScore, weight: 30 },
          ].map(({ label, score, weight }) => (
            <div key={label} className="space-y-1">
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                    score >= 80 ? 'bg-green-500' :
                    score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};