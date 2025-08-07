import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Crown, Users, Gift, Sparkles, Heart, Timer } from 'lucide-react';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

interface EnhancedPaywallProps {
  featureName?: string;
  isPartnerInvited?: boolean;
  onClose?: () => void;
}

export const EnhancedPaywall: React.FC<EnhancedPaywallProps> = ({
  featureName,
  isPartnerInvited = false,
  onClose
}) => {
  const { premiumAccess, loading, getTrialTimeRemaining, isTrialExpiringSoon } = useEnhancedSubscription();
  const { plans, subscribeToPlan } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  
  const trialTime = getTrialTimeRemaining();
  const isTrialActive = premiumAccess.status === 'trial';
  const trialExpiring = isTrialExpiringSoon();

  // Auto-select most popular plan
  useEffect(() => {
    const popularPlan = plans.find(p => p.name.toLowerCase().includes('yearly')) || plans[0];
    if (popularPlan) {
      setSelectedPlan(popularPlan.id);
    }
  }, [plans]);

  const handleSubscribe = async (planId: string) => {
    setProcessing(true);
    try {
      const success = await subscribeToPlan(planId);
      if (success) {
        toast({
          title: "🎉 Welcome to Premium!",
          description: "You now have unlimited access to all features.",
        });
        onClose?.();
      } else {
        toast({
          title: "Subscription Failed",
          description: "Please try again or contact support.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const features = [
    {
      icon: Heart,
      title: "Unlimited Card Games",
      description: "Access to all relationship-building card games and challenges",
      premium: true
    },
    {
      icon: Sparkles,
      title: "AI Relationship Coach",
      description: "Personal guidance and insights powered by advanced AI",
      premium: true
    },
    {
      icon: Users,
      title: "Partner Sync & Analytics",
      description: "Advanced couple analytics and progress tracking",
      premium: true
    },
    {
      icon: Gift,
      title: "Premium Date Ideas",
      description: "Curated experiences and personalized recommendations",
      premium: true
    },
    {
      icon: Crown,
      title: "Priority Support",
      description: "Get help when you need it with priority customer support",
      premium: true
    }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin text-4xl mb-4">💕</div>
          <p>Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 border-purple-500/30 text-white">
          <CardHeader className="text-center pb-6">
            {isPartnerInvited ? (
              <div className="space-y-2">
                <Users className="w-12 h-12 mx-auto text-primary-glow" />
                <CardTitle className="text-3xl font-bold">
                  Your Partner Shared Premium! 🎉
                </CardTitle>
                <p className="text-purple-200">
                  You're automatically getting premium access through your partner's subscription
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Crown className="w-12 h-12 mx-auto text-primary-glow" />
                <CardTitle className="text-3xl font-bold">
                  {featureName ? `Unlock ${featureName}` : 'Upgrade to Premium'}
                </CardTitle>
                <p className="text-purple-200">
                  Get unlimited access to all premium features
                </p>
              </div>
            )}

            {/* Trial Status */}
            {isTrialActive && trialTime && (
              <div className="mt-4 p-4 bg-primary/20 rounded-lg border border-primary/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className="w-4 h-4" />
                  <span className="font-semibold">
                    Trial Ends In: {trialTime.days}d {trialTime.hours}h {trialTime.minutes}m
                  </span>
                </div>
                <Progress 
                  value={trialExpiring ? 20 : 60} 
                  className="h-2 bg-purple-800"
                />
                {trialExpiring && (
                  <p className="text-sm text-red-300 mt-2">
                    ⚠️ Your trial is expiring soon! Subscribe now to keep premium access.
                  </p>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/10 backdrop-blur">
                  <feature.icon className="w-5 h-5 text-primary-glow mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-white">{feature.title}</h4>
                    <p className="text-sm text-purple-200">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {!isPartnerInvited && (
              <>
                {/* Subscription Plans */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-center">Choose Your Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                      <Card 
                        key={plan.id}
                        className={`relative cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? 'ring-2 ring-primary bg-primary/20'
                            : 'bg-white/10 hover:bg-white/20'
                        } border-white/20`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        {plan.name.toLowerCase().includes('yearly') && (
                          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-primary-glow text-white">
                            Most Popular
                          </Badge>
                        )}
                        
                        <CardContent className="p-4 text-center text-white">
                          <h4 className="font-bold text-lg">{plan.name}</h4>
                          <div className="my-3">
                            <span className="text-2xl font-bold">{plan.price}</span>
                            <span className="text-sm text-purple-200">/{plan.period}</span>
                          </div>
                          {plan.discount && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 mb-2">
                              {plan.discount}
                            </Badge>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary mr-2" />
                              <span className="text-sm">7-day free trial</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary mr-2" />
                              <span className="text-sm">All premium features</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    size="lg"
                    onClick={() => handleSubscribe(selectedPlan)}
                    disabled={processing || !selectedPlan}
                    className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold px-8"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin w-4 h-4 mr-2">⭐</div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        {isTrialActive ? 'Continue with Premium' : 'Start Free Trial'}
                      </>
                    )}
                  </Button>
                  
                  {onClose && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={onClose}
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      Maybe Later
                    </Button>
                  )}
                </div>

                {/* Trial Info */}
                {!isTrialActive && (
                  <div className="text-center text-sm text-purple-200 space-y-1">
                    <p>✨ Start with a free 7-day trial</p>
                    <p>💳 No charge until trial ends</p>
                    <p>❌ Cancel anytime</p>
                  </div>
                )}
              </>
            )}

            {/* Partner Invitation Success */}
            {isPartnerInvited && (
              <div className="text-center space-y-4">
                <div className="text-6xl">🎉</div>
                <p className="text-lg text-purple-200">
                  You're all set! Enjoy unlimited access to all premium features.
                </p>
                <Button
                  size="lg"
                  onClick={onClose}
                  className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold px-8"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Start Exploring
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};