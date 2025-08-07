import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Target, Crown, Mail, Check, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEnhancedSubscription } from "@/hooks/useEnhancedSubscription";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingData {
  relationshipType: string;
  goals: string[];
  subscriptionPlan: string;
  partnerEmail: string;
  skipPartnerInvite: boolean;
}

const EnhancedOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useEnhancedSubscription();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    relationshipType: "",
    goals: [],
    subscriptionPlan: "",
    partnerEmail: "",
    skipPartnerInvite: false
  });

  const totalSteps = 6; // Welcome, Relationship, Goals, Subscription, Partner Invite, Complete

  const relationshipTypes = [
    { id: "dating", label: "Dating", icon: <Heart size={24} className="text-pink-500" /> },
    { id: "engaged", label: "Engaged", icon: <Heart size={24} className="text-purple-500" /> },
    { id: "married", label: "Married", icon: <Heart size={24} className="text-red-500" /> },
    { id: "long-distance", label: "Long Distance", icon: <Heart size={24} className="text-blue-500" /> }
  ];

  const goalOptions = [
    { id: "quality-time", label: "Improve Quality Time", icon: "⏰" },
    { id: "communication", label: "Better Communication", icon: "💬" },
    { id: "intimacy", label: "Enhance Intimacy", icon: "💕" },
    { id: "conflict-resolution", label: "Resolve Conflicts", icon: "🤝" },
    { id: "date-planning", label: "Plan Better Dates", icon: "📅" },
    { id: "emotional-connection", label: "Deepen Emotional Connection", icon: "❤️" }
  ];

  const subscriptionPlans = [
    {
      id: "basic",
      name: "Basic",
      price: "$4.99/month",
      features: ["Basic relationship tracking", "Daily check-ins", "Simple date suggestions"],
      popular: false
    },
    {
      id: "premium",
      name: "Premium",
      price: "$9.99/month", 
      features: ["Everything in Basic", "AI Relationship Coach", "Advanced games & activities", "Detailed insights", "Priority support"],
      popular: true
    },
    {
      id: "couple",
      name: "Couple Plan",
      price: "$14.99/month",
      features: ["Everything in Premium", "Shared premium for both partners", "Couples counseling resources", "Exclusive content"],
      popular: false
    }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const handleGoalToggle = (goalId: string) => {
    const currentGoals = onboardingData.goals;
    const newGoals = currentGoals.includes(goalId) 
      ? currentGoals.filter(g => g !== goalId)
      : [...currentGoals, goalId];
    updateOnboardingData({ goals: newGoals });
  };

  const handleSubscriptionPurchase = async (planId: string) => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    setLoading(true);
    try {
      // For now, just update the onboarding data
      // In real implementation, this would trigger Stripe checkout
      updateOnboardingData({ subscriptionPlan: planId });
      toast.success("Subscription plan selected!");
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to process subscription");
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerInvite = async () => {
    if (!onboardingData.partnerEmail.trim() && !onboardingData.skipPartnerInvite) {
      toast.error("Please enter your partner's email or choose to skip");
      return;
    }

    if (onboardingData.skipPartnerInvite) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-signup-invitation', {
        body: {
          email: onboardingData.partnerEmail,
          inviter_name: user?.email?.split('@')[0] || 'Your partner',
          relationship_context: {
            type: onboardingData.relationshipType,
            goals: onboardingData.goals
          }
        }
      });

      if (error) throw error;

      toast.success("Invitation sent to your partner!");
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error("Invitation error:", error);
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Save onboarding data to the user's profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          onboarding_completed: true,
          relationship_type: onboardingData.relationshipType,
          relationship_goals: onboardingData.goals,
          subscription_plan: onboardingData.subscriptionPlan
        });

      if (error) throw error;

      toast.success("Welcome to LoveSync! 🎉");
      navigate('/');
    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast.error("Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                <Heart size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold">Welcome to LoveSync! 💕</h1>
              <p className="text-muted-foreground text-lg">
                Let's set up your perfect relationship companion in just a few steps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="p-4">
                <div className="text-center space-y-2">
                  <Target className="mx-auto text-blue-500" size={24} />
                  <h3 className="font-semibold">Set Goals</h3>
                  <p className="text-sm text-muted-foreground">Define what you want to improve</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center space-y-2">
                  <Crown className="mx-auto text-purple-500" size={24} />
                  <h3 className="font-semibold">Choose Plan</h3>
                  <p className="text-sm text-muted-foreground">Select your subscription level</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center space-y-2">
                  <Users className="mx-auto text-green-500" size={24} />
                  <h3 className="font-semibold">Invite Partner</h3>
                  <p className="text-sm text-muted-foreground">Connect with your loved one</p>
                </div>
              </Card>
            </div>
          </div>
        );

      case 1: // Relationship Type
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Users size={48} className="mx-auto text-purple-500" />
              <h1 className="text-3xl font-bold">What's Your Relationship Status?</h1>
              <p className="text-muted-foreground">Help us customize your experience</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {relationshipTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    onboardingData.relationshipType === type.id 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                      : 'border-border hover:border-purple-300'
                  }`}
                  onClick={() => updateOnboardingData({ relationshipType: type.id })}
                >
                  <div className="text-center space-y-3">
                    {type.icon}
                    <p className="font-semibold">{type.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2: // Goals
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Target size={48} className="mx-auto text-blue-500" />
              <h1 className="text-3xl font-bold">What Are Your Relationship Goals?</h1>
              <p className="text-muted-foreground">Select all that apply - we'll tailor your experience</p>
            </div>
            
            <div className="space-y-3">
              {goalOptions.map((goal) => (
                <Card 
                  key={goal.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    onboardingData.goals.includes(goal.id) 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-border hover:border-blue-300'
                  }`}
                  onClick={() => handleGoalToggle(goal.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      onboardingData.goals.includes(goal.id) 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-muted-foreground'
                    }`}>
                      {onboardingData.goals.includes(goal.id) && <Check size={16} className="text-white" />}
                    </div>
                    <span className="text-2xl">{goal.icon}</span>
                    <p className="font-medium">{goal.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3: // Subscription
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Crown size={48} className="mx-auto text-purple-500" />
              <h1 className="text-3xl font-bold">Choose Your Plan</h1>
              <p className="text-muted-foreground">Start with a 7-day free trial, cancel anytime</p>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                🎉 7-Day Free Trial for All Plans
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative p-6 cursor-pointer transition-all hover:shadow-lg ${
                    plan.popular ? 'border-purple-500 scale-105' : 'border-border'
                  }`}
                  onClick={() => handleSubscriptionPurchase(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-500">
                      <Star size={12} className="mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center p-0 mb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-2xl font-bold text-purple-600">{plan.price}</div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check size={16} className="text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full mt-4"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Start Free Trial"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4: // Partner Invitation
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Mail size={48} className="mx-auto text-green-500" />
              <h1 className="text-3xl font-bold">Invite Your Partner</h1>
              <p className="text-muted-foreground">
                Share the love! Invite your partner to join your relationship journey
              </p>
            </div>
            
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="partnerEmail">Partner's Email Address</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    placeholder="partner@example.com"
                    value={onboardingData.partnerEmail}
                    onChange={(e) => updateOnboardingData({ partnerEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skipInvite"
                    checked={onboardingData.skipPartnerInvite}
                    onChange={(e) => updateOnboardingData({ skipPartnerInvite: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="skipInvite" className="text-sm">
                    I'll invite my partner later
                  </Label>
                </div>
                
                {onboardingData.subscriptionPlan === 'premium' && (
                  <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <Zap size={16} />
                      <span className="font-medium">Premium Benefit</span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      Your partner will get full premium access when they join!
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        );

      case 5: // Complete
        return (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <Check size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold">You're All Set! 🎉</h1>
              <p className="text-muted-foreground text-lg">
                Welcome to your relationship journey with LoveSync
              </p>
            </div>
            
            <Card className="p-6 text-left">
              <h3 className="font-semibold mb-4">What's Next:</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  Complete your daily check-in together
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  Explore fun relationship games
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  Plan your next amazing date
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  Build your memory vault together
                </li>
              </ul>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep === 4) {
      handlePartnerInvite();
    } else if (currentStep === 5) {
      completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return onboardingData.relationshipType !== "";
      case 2:
        return onboardingData.goals.length > 0;
      case 3:
        return onboardingData.subscriptionPlan !== "";
      case 4:
        return onboardingData.partnerEmail.trim() !== "" || onboardingData.skipPartnerInvite;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 0:
        return "Let's Get Started";
      case 4:
        return onboardingData.skipPartnerInvite ? "Continue" : "Send Invitation";
      case 5:
        return "Enter LoveSync";
      default:
        return "Continue";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-3 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        {currentStep !== 3 && ( // Hide navigation on subscription step (has its own buttons)
          <div className="flex gap-4 justify-center">
            {currentStep > 0 && (
              <Button 
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="px-8"
              >
                Back
              </Button>
            )}
            
            <Button 
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? "Processing..." : getNextButtonText()}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedOnboarding;