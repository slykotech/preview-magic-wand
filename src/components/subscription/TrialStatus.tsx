import { Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';

export const TrialStatus = () => {
  const { premiumAccess, getTrialDaysRemaining, cancelSubscription } = useEnhancedSubscription();

  if (!premiumAccess.has_access || premiumAccess.status !== 'trial' || premiumAccess.access_type === 'partner_linked') {
    return null;
  }

  const daysRemaining = getTrialDaysRemaining();
  const isExpiringSoon = daysRemaining <= 2;

  return (
    <Card className={`border-2 ${isExpiringSoon ? 'border-warning bg-warning/5' : 'border-primary/30 bg-primary/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isExpiringSoon ? 'bg-warning/20' : 'bg-primary/20'
          }`}>
            {isExpiringSoon ? (
              <AlertTriangle className="w-5 h-5 text-warning" />
            ) : (
              <Clock className="w-5 h-5 text-primary" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="font-semibold text-foreground">
              {daysRemaining > 0 ? `${daysRemaining} days left in trial` : 'Trial expires today'}
            </div>
            <div className="text-sm text-muted-foreground">
              {daysRemaining > 0 
                ? `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. No charges until then.`
                : 'Your trial expires today. You will be charged $9.99 unless you cancel.'
              }
            </div>
          </div>
        </div>

        {isExpiringSoon && (
          <div className="mt-3 pt-3 border-t border-warning/20">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cancelSubscription}
                className="border-warning/30 text-warning hover:bg-warning/10"
              >
                Cancel Trial
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                Continue Premium
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};