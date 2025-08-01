import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, Heart, MessageCircle, Camera, Trophy, Zap, X } from 'lucide-react';

interface SyncScoreBreakdownProps {
  score: number;
  breakdown: {
    checkinPoints: number;
    storyPoints: number;
    communicationPoints: number;
    milestonePoints: number;
    streakBonus: number;
  };
  className?: string;
  onClose?: () => void;
}

export const SyncScoreBreakdown: React.FC<SyncScoreBreakdownProps> = ({
  score,
  breakdown,
  className = '',
  onClose
}) => {
  const categories = [
    {
      name: 'Daily Check-ins',
      points: breakdown.checkinPoints,
      maxPoints: 40,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
      description: 'Points from daily mood and relationship check-ins'
    },
    {
      name: 'Story Sharing',
      points: breakdown.storyPoints,
      maxPoints: 30,
      icon: Camera,
      color: 'from-purple-500 to-purple-600',
      description: 'Points from sharing and interacting with stories'
    },
    {
      name: 'Communication',
      points: breakdown.communicationPoints,
      maxPoints: 20,
      icon: MessageCircle,
      color: 'from-green-500 to-green-600',
      description: 'Points from messages and conversations'
    },
    {
      name: 'Milestones',
      points: breakdown.milestonePoints,
      maxPoints: 10,
      icon: Heart,
      color: 'from-red-500 to-red-600',
      description: 'Points from creating memories and completing dates'
    },
    {
      name: 'Streak Bonus',
      points: breakdown.streakBonus,
      maxPoints: 10,
      icon: Zap,
      color: 'from-yellow-500 to-yellow-600',
      description: 'Bonus points for maintaining daily activity streaks'
    }
  ];

  const getScoreLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600', emoji: '🔥' };
    if (score >= 75) return { level: 'Great', color: 'text-blue-600', emoji: '✨' };
    if (score >= 60) return { level: 'Good', color: 'text-yellow-600', emoji: '⭐' };
    if (score >= 40) return { level: 'Fair', color: 'text-orange-600', emoji: '💫' };
    return { level: 'Needs Work', color: 'text-red-600', emoji: '💪' };
  };

  const scoreLevel = getScoreLevel(score);

  return (
    <Card className={`${className} border-none shadow-elegant bg-gradient-to-br from-background to-muted/20`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-bold">Sync Score Breakdown</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${scoreLevel.color}`}>{score}%</span>
              <span className="text-2xl">{scoreLevel.emoji}</span>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted/50"
              >
                <X size={18} />
              </Button>
            )}
          </div>
        </CardTitle>
        <p className={`text-sm ${scoreLevel.color} font-medium`}>
          {scoreLevel.level}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {categories.map((category) => {
          const percentage = (category.points / category.maxPoints) * 100;
          const Icon = category.icon;
          
          return (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white shadow-md`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{category.points}/{category.maxPoints}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(percentage)}%</p>
                </div>
              </div>
              
              <Progress 
                value={percentage} 
                className="h-2"
              />
            </div>
          );
        })}
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-accent" size={18} />
            <span className="font-semibold text-sm">Tips to Improve</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {breakdown.checkinPoints < 20 && (
              <p>• Complete daily check-ins together for maximum points</p>
            )}
            {breakdown.storyPoints < 15 && (
              <p>• Share more stories and interact with your partner's posts</p>
            )}
            {breakdown.communicationPoints < 10 && (
              <p>• Send more messages and have deeper conversations</p>
            )}
            {breakdown.milestonePoints < 5 && (
              <p>• Create memories and complete date activities together</p>
            )}
            {breakdown.streakBonus < 5 && (
              <p>• Maintain daily activity streaks for bonus points</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};