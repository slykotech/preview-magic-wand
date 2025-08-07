import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Calendar, MessageSquare, Camera, BarChart3, Users2, Shield, Crown } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { EnhancedTrialFlow } from '@/components/subscription/EnhancedTrialFlow';
import { TrialAnalytics } from '@/components/subscription/TrialAnalytics';

const features = [
  {
    icon: Heart,
    title: 'Card Games for Couples',
    description: 'Interactive questions and challenges designed to bring you closer together',
    color: 'text-pink-500'
  },
  {
    icon: MessageSquare,
    title: 'AI Relationship Coach',
    description: 'Get personalized advice and insights to strengthen your relationship',
    color: 'text-purple-500'
  },
  {
    icon: Calendar,
    title: 'Smart Date Planner',
    description: 'Discover exciting date ideas tailored to your preferences and location',
    color: 'text-blue-500'
  },
  {
    icon: Camera,
    title: 'Memory Vault',
    description: 'Store and cherish your favorite moments and memories together',
    color: 'text-green-500'
  },
  {
    icon: BarChart3,
    title: 'Relationship Insights',
    description: 'Track your sync score and relationship health over time',
    color: 'text-orange-500'
  },
  {
    icon: Users2,
    title: 'Partner Connection',
    description: 'Stay connected with real-time messaging and shared experiences',
    color: 'text-indigo-500'
  }
];

export const SubscriptionTrial: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans } = useSubscription();
  const [showTrialFlow, setShowTrialFlow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    // Redirect non-authenticated users to auth
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setShowTrialFlow(true);
  };

  const handleTrialStarted = () => {
    navigate('/dashboard');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  if (showTrialFlow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-8">
        <div className="container mx-auto px-4">
          <EnhancedTrialFlow 
            onTrialStarted={handleTrialStarted}
            onSkip={handleSkip}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <TrialAnalytics />
      <GradientHeader 
        title="Start Your Free Trial"
        subtitle={`Welcome ${user.email?.split('@')[0]}! Unlock all premium features`}
        icon="🚀"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Trial Offer Card */}
          <Card className="mb-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-2">7-Day Free Trial</h2>
              <p className="text-xl mb-4 text-white/90">
                Experience all premium features at no cost
              </p>
            </CardContent>
          </Card>

          {/* Subscription Plans */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative h-full hover:shadow-lg transition-all cursor-pointer border-2 ${
                  plan.name.toLowerCase().includes('premium') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {plan.name.toLowerCase().includes('premium') && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    ${plan.price}
                    <span className="text-lg font-normal text-muted-foreground">/{plan.period}</span>
                  </div>
                  {plan.discount && (
                    <Badge variant="secondary" className="w-fit">
                      Save {plan.discount}%
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full mb-4 bg-gradient-to-r from-primary to-primary-glow"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(plan.id);
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <div className="text-xs text-center text-muted-foreground">
                    7 days free, then ${plan.price}/{plan.period}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trial Benefits */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center">What's Included in Your Free Trial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">✨ Full Premium Access</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Unlimited card games and challenges</li>
                    <li>• AI-powered relationship coaching</li>
                    <li>• Advanced date planning tools</li>
                    <li>• Unlimited memory storage</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">🔒 Risk-Free Trial</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• No charges for 7 full days</li>
                    <li>• Cancel anytime with one click</li>
                    <li>• Keep all memories if you cancel</li>
                    <li>• No hidden fees or commitments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Choose a plan above to start your 7-day free trial
            </p>
          </div>

          {/* Testimonial */}
          <Card className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">💕</div>
              <blockquote className="text-lg italic text-muted-foreground mb-3">
                "Love Sync has completely transformed how my partner and I connect. The card games are so fun and the AI coach gives amazing advice!"
              </blockquote>
              <cite className="text-sm font-medium">- Sarah M., Premium User</cite>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};