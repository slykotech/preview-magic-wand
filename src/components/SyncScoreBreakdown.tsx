import React from 'react';
import { X, Heart, Calendar, MessageSquare, Camera, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SyncScoreBreakdownProps {
  score: number;
  breakdown: {
    checkinPoints: number;
    storyPoints: number;
    communicationPoints: number;
    milestonePoints: number;
    streakBonus: number;
  };
  onClose?: () => void;
  className?: string;
}

export const SyncScoreBreakdown: React.FC<SyncScoreBreakdownProps> = ({
  score,
  breakdown,
  onClose,
  className = '',
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getComponentColor = (points: number, maxPoints: number) => {
    const percentage = Math.abs(points) / maxPoints * 100;
    if (points > 0) {
      if (percentage >= 80) return 'text-green-500 bg-green-500/10 border-green-500/20';
      if (percentage >= 50) return 'text-green-600 bg-green-600/10 border-green-600/20';
      return 'text-green-700 bg-green-700/10 border-green-700/20';
    } else if (points < 0) {
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
    return 'text-muted-foreground bg-muted/10 border-muted/20';
  };

  const formatPoints = (points: number) => {
    return points > 0 ? `+${points}` : points.toString();
  };

  const components = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'Daily Check-ins',
      points: breakdown.checkinPoints,
      maxPoints: 14,
      description: 'Both check-in: +2pts, One: -1pt, None: -2pts per day'
    },
    {
      icon: <Camera className="w-5 h-5" />,
      label: 'Story Sharing',
      points: breakdown.storyPoints,
      maxPoints: 19, // 14 base + 5 interaction bonus
      description: 'Both share: +2pts, One: -1pt, None: -2pts per day'
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'Communication',
      points: breakdown.communicationPoints,
      maxPoints: 20,
      description: '1pt per 2 messages sent in past 7 days'
    },
    {
      icon: <Heart className="w-5 h-5" />,
      label: 'Milestones',
      points: breakdown.milestonePoints,
      maxPoints: 15,
      description: 'Memories: +5pts each, Completed dates: +10pts each'
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Streak Bonus',
      points: breakdown.streakBonus,
      maxPoints: 10,
      description: '1pt per day of active streaks (check-ins + stories)'
    },
  ];

  return (
    <Card className={`w-full max-w-md mx-auto bg-background border shadow-lg ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-primary" />
            Love Sync Score Breakdown
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
          <div className={`text-3xl font-bold ${getScoreColor(score)} mb-1`}>
            {score}%
          </div>
          <p className="text-sm text-muted-foreground">
            {score >= 80 ? '💚 Healthy' : score >= 50 ? '🧡 Moderate' : '❤️ Needs Work'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Base: 50% + Activity Modifiers
          </p>
        </div>

        {/* Component Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Score Components:</h3>
          
          {components.map((component, index) => (
            <div key={index} className={`p-3 rounded-lg border ${getComponentColor(component.points, component.maxPoints)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={component.points >= 0 ? 'text-current' : 'text-red-500'}>
                    {component.icon}
                  </div>
                  <span className="font-medium text-sm">{component.label}</span>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-sm ${
                    component.points > 0 ? 'text-green-600' : 
                    component.points < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {formatPoints(component.points)} pts
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / ±{component.maxPoints}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-2">
                <Progress 
                  value={Math.abs(component.points) / component.maxPoints * 100} 
                  className="h-2"
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                {component.description}
              </p>
            </div>
          ))}
        </div>

        {/* Calculation Formula */}
        <div className="p-3 bg-muted/10 rounded-lg">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Formula:</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>50% base</strong> + Check-ins ({formatPoints(breakdown.checkinPoints)}) + 
            Stories ({formatPoints(breakdown.storyPoints)}) + Communication (+{breakdown.communicationPoints}) + 
            Milestones (+{breakdown.milestonePoints}) + Streaks (+{breakdown.streakBonus}) = <strong>{score}%</strong>
          </p>
        </div>

        {/* Tips */}
        <div className="p-3 bg-primary/5 rounded-lg">
          <h4 className="text-xs font-semibold text-primary mb-2">💡 Tips to Improve:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Both partners check-in daily for maximum points</li>
            <li>• Share stories together for bonus points</li>
            <li>• Maintain communication throughout the week</li>
            <li>• Create memories and complete date plans</li>
            <li>• Keep your streaks alive for bonus points</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};