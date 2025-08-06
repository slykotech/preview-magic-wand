import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Crown, Users, Target, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';

interface OnboardingStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  description: string;
}

interface OnboardingProgressProps {
  userProfile?: {
    relationship_type?: string;
    relationship_goals?: string[];
    onboarding_completed?: boolean;
  };
  hasPartner?: boolean;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ 
  userProfile, 
  hasPartner = false 
}) => {
  const navigate = useNavigate();
  const { premiumAccess, subscription } = useEnhancedSubscription();

  // Calculate onboarding steps completion
  const steps: OnboardingStep[] = [
    {
      id: 'relationship',
      title: 'Relationship Type',
      icon: <Target size={20} />,
      completed: !!userProfile?.relationship_type,
      description: 'Set your relationship status'
    },
    {
      id: 'goals',
      title: 'Relationship Goals',
      icon: <CheckCircle size={20} />,
      completed: !!userProfile?.relationship_goals?.length,
      description: 'Define what you want to improve'
    },
    {
      id: 'subscription',
      title: 'Subscription Plan',
      icon: <Crown size={20} />,
      completed: premiumAccess.has_access,
      description: 'Choose your plan with free trial'
    },
    {
      id: 'partner',
      title: 'Partner Connection',
      icon: <Users size={20} />,
      completed: hasPartner,
      description: 'Invite your partner to join'
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;
  const isOnboardingComplete = userProfile?.onboarding_completed || (premiumAccess.has_access && completedSteps >= 2);

  if (isOnboardingComplete) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Onboarding Complete! 🎉
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                You're all set to explore LoveSync together
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complete Your Setup</CardTitle>
          <Badge variant="outline">
            {completedSteps}/{steps.length} Steps
          </Badge>
        </div>
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {Math.round(progressPercentage)}% complete
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {steps.map((step) => (
          <div 
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              step.completed 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-muted/50 border-border'
            }`}
          >
            <div className={`p-2 rounded-full ${
              step.completed 
                ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step.completed ? <CheckCircle size={16} /> : step.icon}
            </div>
            
            <div className="flex-1">
              <h4 className={`font-medium ${
                step.completed ? 'text-green-800 dark:text-green-200' : 'text-foreground'
              }`}>
                {step.title}
              </h4>
              <p className={`text-sm ${
                step.completed 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-muted-foreground'
              }`}>
                {step.description}
              </p>
            </div>
            
            {step.completed && (
              <CheckCircle size={20} className="text-green-500" />
            )}
          </div>
        ))}
        
        {!isOnboardingComplete && (
          <div className="pt-4 border-t">
            <Button 
              onClick={() => navigate('/enhanced-onboarding')}
              className="w-full"
            >
              Continue Setup
            </Button>
          </div>
        )}
        
        {/* Subscription Status */}
        {premiumAccess.has_access && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Crown size={16} className="text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {premiumAccess.access_type === 'partner_linked' 
                  ? 'Premium (Partner Shared)' 
                  : `${subscription?.plan_type || 'Premium'} Plan`}
              </span>
              {subscription?.status === 'trial' && (
                <Badge variant="outline" className="text-xs">
                  Free Trial
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};