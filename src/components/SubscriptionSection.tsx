import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2, Star, Sparkles, Gift, Zap } from 'lucide-react';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionSectionProps {
  onClose?: () => void;
}

const PlanCard = ({ 
  plan, 
  isSubscribing, 
  onSubscribe 
}: { 
  plan: SubscriptionPlan; 
  isSubscribing: boolean; 
  onSubscribe: (planId: string) => void; 
}) => (
  <Card className={`p-4 relative transition-all duration-200 hover:shadow-lg ${
    plan.isPopular ? 'ring-2 ring-primary border-primary/50' : ''
  }`}>
    {plan.isPopular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <Badge className="bg-primary text-primary-foreground px-3 py-1">
          <Star size={12} className="mr-1" />
          Most Popular
        </Badge>
      </div>
    )}
    
    <div className="text-center space-y-3">
      <div>
        <h3 className="font-poppins font-semibold text-lg">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-semibold text-primary">{plan.price}</span>
          <span className="text-muted-foreground">/{plan.period}</span>
        </div>
        {plan.discount && (
          <Badge variant="secondary" className="mt-1">
            {plan.discount}
          </Badge>
        )}
      </div>
      
      <Button 
        onClick={() => onSubscribe(plan.id)}
        disabled={isSubscribing}
        className={`w-full ${plan.isPopular ? 'bg-primary hover:bg-primary/90' : ''}`}
        variant={plan.isPopular ? 'default' : 'outline'}
      >
        {isSubscribing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Subscribe Now'
        )}
      </Button>
    </div>
  </Card>
);

export const SubscriptionSection = ({ onClose }: SubscriptionSectionProps) => {
  const { subscriptionInfo, plans, subscribeToPlan, manageBilling, restorePurchases } = useSubscription();
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (planId: string) => {
    setSubscribingPlan(planId);
    
    try {
      const success = await subscribeToPlan(planId);
      
      if (success) {
        toast({
          title: "Subscription Active! 🎉",
          description: "Welcome to premium! Enjoy all the exclusive features.",
        });
      } else {
        toast({
          title: "Subscription Failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Subscription Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubscribingPlan(null);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    
    try {
      const restored = await restorePurchases();
      
      if (restored) {
        toast({
          title: "Purchases Restored! ✅",
          description: "Your subscription has been restored.",
        });
      } else {
        toast({
          title: "No Purchases Found",
          description: "No active subscriptions found to restore.",
        });
      }
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Failed to restore purchases. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (subscriptionInfo.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="text-primary" size={20} />
          <h2 className="text-lg font-extrabold font-poppins">Your Subscription</h2>
        </div>
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading subscription status...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="text-primary" size={20} />
        <h2 className="text-lg font-extrabold font-poppins">Your Subscription</h2>
      </div>

      {subscriptionInfo.isActive ? (
        // Active Subscription Display
        <Card className="p-6 bg-gradient-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-full">
              <Crown className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="font-poppins font-bold">Premium Active</h3>
              <p className="text-sm text-muted-foreground">
                {subscriptionInfo.planName} Plan
              </p>
            </div>
            <div className="ml-auto">
              <Badge className="bg-green-500/20 text-green-700 border-green-500/20">
                <Check size={12} className="mr-1" />
                Active
              </Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next billing date:</span>
              <span className="font-semibold">{subscriptionInfo.nextBillingDate}</span>
            </div>
            
            <Button 
              onClick={manageBilling}
              variant="outline" 
              className="w-full"
            >
              Manage Subscription
            </Button>
          </div>
        </Card>
      ) : (
        // Subscription Plans Display
        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <Crown className="mx-auto text-primary" size={40} />
                <Sparkles className="absolute -top-1 -right-1 text-yellow-500" size={16} />
              </div>
              <div>
                <h3 className="font-poppins font-bold text-xl">Unlock Premium Features</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Transform your relationship with unlimited access to all tools
                </p>
              </div>
              
              {/* Premium Features List */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="text-primary" size={14} />
                  <span>Unlimited AI coaching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-primary" size={14} />
                  <span>Advanced insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="text-primary" size={14} />
                  <span>Premium date ideas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="text-primary" size={14} />
                  <span>Priority support</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSubscribing={subscribingPlan === plan.id}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>

          <div className="space-y-3">
            <div className="text-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRestore}
                disabled={isRestoring}
                className="text-muted-foreground"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Restore Purchases'
                )}
              </Button>
            </div>
            
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>✓ Cancel anytime</p>
              <p>✓ Secure payments via App Store/Google Play</p>
              <p>✓ 7-day free trial included</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};