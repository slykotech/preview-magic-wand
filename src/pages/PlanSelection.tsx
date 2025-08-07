import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  discount?: string;
  isPopular?: boolean;
  features: string[];
}

export const PlanSelection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const plans: Plan[] = [
    {
      id: 'monthly',
      name: 'Monthly Premium',
      price: '$9.99',
      period: 'month',
      features: [
        'Unlimited daily check-ins',
        'AI relationship coach',
        'Premium games & activities',
        'Advanced memory vault',
        'Priority support'
      ]
    },
    {
      id: 'yearly',
      name: 'Annual Premium',
      price: '$5.99',
      originalPrice: '$9.99',
      period: 'month',
      discount: '40% OFF',
      isPopular: true,
      features: [
        'All monthly features',
        'Relationship insights report',
        'Partner sync across devices',
        'Exclusive couple challenges',
        'VIP customer support'
      ]
    },
    {
      id: 'lifetime',
      name: 'Lifetime Access',
      price: '$99.99',
      originalPrice: '$199.99',
      period: 'once',
      discount: '50% OFF',
      features: [
        'All premium features forever',
        'No recurring charges',
        'Future feature updates',
        'Premium support for life',
        'Best value overall'
      ]
    }
  ];

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    if (selectedPlan) {
      navigate('/subscription/payment', { 
        state: { selectedPlan } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/subscription/trial')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-foreground">Choose Your Plan</h1>
            <p className="text-muted-foreground">All plans include 7-day free trial</p>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-4 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
                selectedPlan?.id === plan.id 
                  ? 'border-primary shadow-lg bg-primary/5' 
                  : plan.isPopular
                  ? 'border-primary/30'
                  : 'border-border'
              }`}
              onClick={() => handlePlanSelect(plan)}
            >
              <div className="space-y-4">
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan?.id === plan.id 
                        ? 'border-primary bg-primary' 
                        : 'border-border'
                    }`}>
                      {selectedPlan?.id === plan.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{plan.name}</h3>
                      {plan.isPopular && (
                        <Badge className="bg-primary text-primary-foreground">
                          <Star className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">/{plan.period}</span>
                    </div>
                    {plan.originalPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}</span>
                        {plan.discount && (
                          <Badge variant="secondary" className="text-xs">
                            {plan.discount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Continue Button */}
        <div className="space-y-4">
          <Button 
            onClick={handleContinue}
            disabled={!selectedPlan}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
            size="lg"
          >
            Continue with {selectedPlan?.name || 'Selected Plan'}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              7-day free trial • Cancel anytime • Secure payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};