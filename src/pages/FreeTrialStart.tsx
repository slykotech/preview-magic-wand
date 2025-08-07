import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gift, Crown, Heart, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FreeTrialStart: React.FC = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: "Unlimited Daily Check-ins",
      description: "Stay connected with your partner every day"
    },
    {
      icon: <Crown className="w-6 h-6 text-primary" />,
      title: "AI Relationship Coach",
      description: "Get personalized advice 24/7"
    },
    {
      icon: <Gift className="w-6 h-6 text-primary" />,
      title: "Premium Games & Activities",
      description: "Access exclusive couple experiences"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Advanced Privacy",
      description: "Your relationship data stays secure"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Gift className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Start Your Free Trial</h1>
          <p className="text-muted-foreground text-lg">
            Experience all premium features for <span className="font-bold text-primary">7 days free</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Card required to start trial</span> - No charges until trial ends
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-4">
                {benefit.icon}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Trial Info */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-3">
            <h3 className="font-semibold text-foreground">What to Expect</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Valid payment method required</p>
              <p>✓ 7 days completely free</p>
              <p>✓ No charges until trial ends</p>
              <p>✓ Cancel anytime in settings</p>
              <p>✓ Full access to all features</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/subscription/plans')}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
            size="lg"
          >
            <Gift className="w-4 h-4 mr-2" />
            Start Free Trial
          </Button>
          
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="w-full"
          >
            Continue with Free Version
          </Button>
        </div>
      </div>
    </div>
  );
};