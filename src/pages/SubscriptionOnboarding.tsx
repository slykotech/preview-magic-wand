import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Shield, Star, Gift, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';

export const SubscriptionOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans, subscribeToPlan, subscriptionInfo } = useSubscription();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect to dashboard if user already has premium access
  useEffect(() => {
    if (!subscriptionInfo.isLoading && subscriptionInfo.isActive) {
      console.log('User already has premium access, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [subscriptionInfo.isLoading, subscriptionInfo.isActive, navigate]);

  const features = [
    "AI-powered relationship insights",
    "Unlimited daily check-ins", 
    "Advanced memory vault with unlimited photos",
    "Premium date planning suggestions",
    "24/7 AI relationship coach",
    "Couple games and activities",
    "Advanced sync score analytics",
    "Priority customer support"
  ];

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsProcessing(true);
    
    try {
      console.log(`Starting RevenueCat subscription for plan: ${plan.id}`);
      
      const success = await subscribeToPlan(plan.id);
      
      if (success) {
        toast({
          description: "Welcome to Love Sync Premium! Your subscription is now active.",
          duration: 3000
        });
        
        // Wait a moment for the toast to show, then navigate
        setTimeout(() => {
          console.log('Navigating to dashboard after successful subscription');
          navigate('/dashboard');
        }, 1500);
      } else {
        toast({
          variant: "destructive",
          description: "Failed to start subscription. Please try again."
        });
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (subscriptionInfo.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-secondary opacity-10 rounded-full blur-3xl transform translate-x-48 -translate-y-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-primary opacity-20 rounded-full blur-3xl transform -translate-x-48 translate-y-48"></div>

      <div className="relative z-10 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center text-white space-y-2 pt-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl font-bold">Love Sync Premium</h1>
            </div>
            <p className="text-white/80">Unlock the full power of your relationship</p>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <div className="bg-accent/50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-foreground" />
                <span className="font-medium text-foreground">7-Day Free Trial on All Plans</span>
              </div>
              <p className="text-sm text-muted-foreground">Cancel anytime through your device's app store</p>
            </div>

            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`p-6 bg-white/95 backdrop-blur-sm shadow-xl cursor-pointer transition-all hover:shadow-2xl border-2 ${
                  plan.isPopular ? 'border-primary' : 'border-transparent'
                } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => !isProcessing && handlePlanSelect(plan)}
              >
                <div className="space-y-4">
                  {plan.isPopular && (
                    <Badge className="bg-primary text-primary-foreground w-fit">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                       <p className="text-sm text-muted-foreground">Billed {plan.period}</p>
                     </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">/{plan.period}</span>
                      </div>
                      {plan.discount && (
                        <Badge variant="secondary" className="text-xs">
                          {plan.discount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {plan.isPopular && (
                    <div className="space-y-3 text-left">
                       <h4 className="text-sm font-medium text-gray-900">Everything included:</h4>
                       <div className="grid grid-cols-2 gap-2">
                         {features.slice(0, 6).map((feature, index) => (
                           <div key={index} className="flex items-center gap-2">
                             <Check className="w-3 h-3 text-primary flex-shrink-0" />
                             <span className="text-xs text-foreground">{feature}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isProcessing && selectedPlan?.id === plan.id && (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Processing subscription...</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            <div className="bg-accent/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Managed by Your App Store</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Subscriptions are handled securely through Apple App Store or Google Play Store
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="text-white hover:text-white hover:bg-white/10"
                disabled={isProcessing}
              >
                Continue with Free Version
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};