import { Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useNavigate } from 'react-router-dom';

export const TrialCountdown = () => {
  const { premiumAccess, getTrialTimeRemaining, isTrialExpiringSoon } = useEnhancedSubscription();
  const navigate = useNavigate();

  if (!premiumAccess.has_access || premiumAccess.status !== 'trial') {
    return null;
  }

  const timeRemaining = getTrialTimeRemaining();
  const isExpiring = isTrialExpiringSoon();

  if (!timeRemaining || timeRemaining.expired) {
    return null;
  }

  const handleUpgrade = () => {
    navigate('/subscription/plans');
  };

  return (
    <Card className={`border-2 transition-all duration-300 ${
      isExpiring 
        ? 'border-warning bg-warning/5 shadow-warning/20 shadow-lg' 
        : 'border-primary/30 bg-primary/5'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isExpiring ? 'bg-warning/20' : 'bg-primary/20'
            }`}>
              {isExpiring ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">
                  {timeRemaining.days > 0 ? 'Free Trial' : 'Trial Ending Soon!'}
                </span>
                <Badge variant={isExpiring ? 'destructive' : 'secondary'} className="text-xs">
                  {timeRemaining.days > 0 ? `${timeRemaining.days}d left` : 'Last day!'}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {timeRemaining.days > 0 ? (
                  `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m remaining`
                ) : (
                  `${timeRemaining.hours}h ${timeRemaining.minutes}m left in your trial`
                )}
              </div>
            </div>
          </div>

          {isExpiring && (
            <Button 
              size="sm"
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all"
            >
              <Clock className="w-4 h-4 mr-1" />
              Upgrade Now
            </Button>
          )}
        </div>

        {isExpiring && (
          <div className="mt-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <p className="text-sm text-warning-foreground">
              <strong>Don't lose access!</strong> Your trial expires soon. 
              Continue enjoying premium features for just $9.99/month.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};