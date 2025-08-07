import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';
import { toast } from '@/hooks/use-toast';

interface PlanOption {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  originalPrice?: number;
  features: string[];
  popular?: boolean;
  description: string;
}

const plans: PlanOption[] = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 9.99,
    period: 'month',
    description: 'Perfect for trying out all features',
    features: [
      'Unlimited card games',
      'AI relationship coach',
      'Date planning assistant',
      'Memory vault',
      'Sync score tracking',
      'Partner chat & messaging',
      'Premium date ideas',
      'Relationship insights'
    ]
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    price: 79.99,
    period: 'year',
    originalPrice: 119.88,
    popular: true,
    description: 'Save 33% with annual billing',
    features: [
      'Everything in monthly plan',
      'Save $40 per year',
      'Priority customer support',
      'Early access to new features',
      'Exclusive relationship content',
      'Advanced analytics',
      'Custom date templates',
      'Relationship milestones'
    ]
  }
];

export const SubscriptionPlans: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [loading, setLoading] = useState(false);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = async () => {
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return;

    setLoading(true);
    try {
      // Store selected plan in localStorage for payment page
      localStorage.setItem('selectedPlan', JSON.stringify(selectedPlanData));
      
      toast({
        title: "Success",
        description: `${selectedPlanData.name} selected!`
      });
      
      // Navigate to payment details
      navigate('/subscription/payment');
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast({
        title: "Error",
        description: "Failed to select plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, period: string) => {
    if (period === 'year') {
      const monthlyEquivalent = price / 12;
      return `$${monthlyEquivalent.toFixed(2)}/month`;
    }
    return `$${price.toFixed(2)}/${period}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <GradientHeader 
        title="Choose Your Plan"
        subtitle="Start your 7-day free trial today"
        icon="⭐"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedPlan === plan.id 
                    ? 'ring-2 ring-primary shadow-lg scale-105' 
                    : 'hover:scale-102'
                } ${plan.popular ? 'border-primary' : ''}`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-bold text-primary">
                        {formatPrice(plan.price, plan.period)}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          ${(plan.originalPrice / 12).toFixed(2)}/month
                        </span>
                      )}
                    </div>
                    {plan.period === 'year' && (
                      <p className="text-sm text-muted-foreground">
                        Billed annually (${plan.price}/year)
                      </p>
                    )}
                    {plan.originalPrice && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Save ${(plan.originalPrice - plan.price).toFixed(2)}/year
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full mt-6 ${
                      selectedPlan === plan.id 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-secondary hover:bg-secondary/90'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(plan.id);
                    }}
                  >
                    {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trial Information */}
          <Card className="bg-gradient-to-r from-purple-100 to-pink-100 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">🎉 7-Day Free Trial Included</h3>
              <p className="text-muted-foreground mb-4">
                Try all premium features risk-free. Cancel anytime during your trial with no charges.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• No commitment required</li>
                <li>• Full access to all features</li>
                <li>• Cancel anytime with one click</li>
              </ul>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="text-center mt-8">
            <Button 
              size="lg" 
              className="px-12 py-3 text-lg"
              onClick={handleContinue}
              disabled={loading || !selectedPlan}
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Your free trial starts immediately after payment verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};