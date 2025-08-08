import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Crown, Calendar, CreditCard, AlertTriangle, CheckCircle, Settings, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionManagerProps {
  onPlanChange?: () => void;
}

export const SubscriptionManager = ({ onPlanChange }: SubscriptionManagerProps) => {
  const { subscriptionInfo, plans, subscribeToPlan, manageBilling, restorePurchases } = useSubscription();
  const { toast } = useToast();
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPlanOptions, setShowPlanOptions] = useState(false);

  const handlePlanChange = async (newPlanId: string) => {
    setIsChangingPlan(true);
    
    try {
      console.log(`Changing subscription to plan: ${newPlanId}`);
      
      const success = await subscribeToPlan(newPlanId);
      
      if (success) {
        toast({
          description: "Your subscription plan has been updated successfully!",
          duration: 3000
        });
        setShowPlanOptions(false);
        onPlanChange?.();
      } else {
        toast({
          variant: "destructive",
          description: "Failed to change subscription plan. Please try again."
        });
      }
    } catch (error) {
      console.error('Plan change error:', error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again."
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    
    try {
      const success = await restorePurchases();
      
      if (success) {
        toast({
          description: "Your purchases have been restored successfully!",
          duration: 3000
        });
      } else {
        toast({
          variant: "destructive",
          description: "No purchases found to restore."
        });
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      toast({
        variant: "destructive",
        description: "Failed to restore purchases. Please try again."
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageBilling = () => {
    manageBilling();
  };

  if (subscriptionInfo.isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading subscription details...</span>
        </div>
      </Card>
    );
  }

  if (!subscriptionInfo.isActive) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No Active Subscription</h3>
              <p className="text-sm text-muted-foreground">Upgrade to Premium for full access</p>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're currently using the free version. Upgrade to unlock premium features like AI coaching, unlimited memories, and advanced analytics.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              className="flex-1"
              onClick={() => window.location.href = '/subscription/trial'}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Restore"
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Subscription Status */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Premium Subscription
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                {subscriptionInfo.planName}
              </p>
            </div>
          </div>

          {subscriptionInfo.nextBillingDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Next billing: {subscriptionInfo.nextBillingDate}</span>
            </div>
          )}

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription is active and managed through your device's app store. You have access to all premium features.
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Subscription Management Actions */}
      <Card className="p-6">
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Subscription
          </h4>

          <div className="grid grid-cols-1 gap-3">
            {/* Change Plan */}
            <Button
              variant="outline"
              onClick={() => setShowPlanOptions(!showPlanOptions)}
              disabled={isChangingPlan}
              className="justify-start"
            >
              <Crown className="w-4 h-4 mr-2" />
              Change Plan
            </Button>

            {/* Manage Billing */}
            <Button
              variant="outline"
              onClick={handleManageBilling}
              className="justify-start"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Billing & Cancel
            </Button>

            {/* Restore Purchases */}
            <Button
              variant="outline"
              onClick={handleRestorePurchases}
              disabled={isRestoring}
              className="justify-start"
            >
              {isRestoring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Restore Purchases
            </Button>
          </div>
        </div>
      </Card>

      {/* Plan Change Options */}
      {showPlanOptions && (
        <Card className="p-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Available Plans</h4>
            <p className="text-sm text-muted-foreground">
              Changes will be processed through your device's app store.
            </p>

            <div className="space-y-3">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`p-4 border rounded-lg ${
                    plan.name === subscriptionInfo.planName 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{plan.name}</h5>
                        {plan.isPopular && (
                          <Badge variant="secondary">
                            Most Popular
                          </Badge>
                        )}
                        {plan.name === subscriptionInfo.planName && (
                          <Badge variant="default" className="bg-primary">
                            Current Plan
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan.price}/{plan.period}
                      </p>
                      {plan.discount && (
                        <p className="text-xs text-primary font-medium">
                          {plan.discount}
                        </p>
                      )}
                    </div>

                    {plan.name !== subscriptionInfo.planName && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm"
                            disabled={isChangingPlan}
                          >
                            {isChangingPlan ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Switch"
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Change Subscription Plan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to change to the {plan.name} plan? 
                              This will be processed through your device's app store and may take effect immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handlePlanChange(plan.id)}>
                              Confirm Change
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Important Notes */}
      <Card className="p-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Important Information</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• All subscriptions include a 7-day free trial for new users</p>
            <p>• Subscriptions automatically renew unless cancelled 24 hours before the renewal date</p>
            <p>• Cancellations must be done through your device's app store settings</p>
            <p>• If you cancel during your trial period, you won't be charged</p>
            <p>• Premium features remain active until your current subscription period ends</p>
          </div>
        </div>
      </Card>
    </div>
  );
};