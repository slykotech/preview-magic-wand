import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useToast } from '@/hooks/use-toast';

interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export const PaymentDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startTrial } = useEnhancedSubscription();
  const { toast } = useToast();
  
  const selectedPlan = location.state?.selectedPlan;
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<CardDetails>>({});

  if (!selectedPlan) {
    navigate('/subscription/plans');
    return null;
  }

  const validateCard = (): boolean => {
    const newErrors: Partial<CardDetails> = {};
    
    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 16) {
      newErrors.number = 'Valid card number required';
    }
    
    if (!cardDetails.expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      newErrors.expiry = 'Valid expiry date required (MM/YY)';
    }
    
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      newErrors.cvc = 'Valid CVC required';
    }
    
    if (!cardDetails.name.trim()) {
      newErrors.name = 'Cardholder name required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (field: keyof CardDetails, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (field === 'cvc') {
      formattedValue = value.replace(/[^0-9]/g, '').substring(0, 4);
    }
    
    setCardDetails(prev => ({
      ...prev,
      [field]: formattedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleStartTrial = async () => {
    if (!validateCard()) return;
    
    setIsProcessing(true);
    
    try {
      const last_four = cardDetails.number.replace(/\s/g, '').slice(-4);
      const brand = 'Visa'; // In real app, detect card brand
      
      // Simulate payment method verification (in real app, validate with Stripe/payment processor)
      const paymentValid = cardDetails.number.length >= 16 && cardDetails.cvc.length >= 3;
      
      if (!paymentValid) {
        toast({
          variant: 'destructive',
          title: 'Invalid Payment Method',
          description: 'Please provide valid payment information to start your trial.',
        });
        return;
      }

      const result = await startTrial(
        { last_four, brand },
        {
          name: selectedPlan.name,
          price: selectedPlan.price,
          period: selectedPlan.period,
          originalPrice: selectedPlan.originalPrice,
          discount: selectedPlan.discount ? parseInt(selectedPlan.discount) : undefined
        }
      );
      
      if (result.success) {
        toast({
          title: 'Trial Started!',
          description: '7-day free trial activated with verified payment method.',
        });
        navigate('/subscription/partner-invite');
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment Setup Failed',
          description: result.error || 'Please check your card details and try again.',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/subscription/plans')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-foreground">Payment Details</h1>
            <p className="text-muted-foreground">Secure payment processing</p>
          </div>
        </div>

        {/* Plan Summary */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{selectedPlan.name}</h3>
              <p className="text-sm text-muted-foreground">7-day free trial, then {selectedPlan.price}/{selectedPlan.period}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">FREE</span>
              <p className="text-xs text-muted-foreground">for 7 days</p>
            </div>
          </div>
        </Card>

        {/* Payment Form */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.number}
                onChange={(e) => handleInputChange('number', e.target.value)}
                maxLength={19}
                className={errors.number ? 'border-destructive' : ''}
              />
              {errors.number && (
                <p className="text-sm text-destructive mt-1">{errors.number}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => handleInputChange('expiry', e.target.value)}
                  maxLength={5}
                  className={errors.expiry ? 'border-destructive' : ''}
                />
                {errors.expiry && (
                  <p className="text-sm text-destructive mt-1">{errors.expiry}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={cardDetails.cvc}
                  onChange={(e) => handleInputChange('cvc', e.target.value)}
                  maxLength={4}
                  className={errors.cvc ? 'border-destructive' : ''}
                />
                {errors.cvc && (
                  <p className="text-sm text-destructive mt-1">{errors.cvc}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Security Notice */}
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Secure Payment</p>
              <p className="text-muted-foreground">Your payment information is encrypted and secure. You won't be charged until your 7-day trial ends.</p>
            </div>
          </div>
        </Card>

        {/* Important Notice */}
        <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-900">Trial Terms</p>
              <p className="text-orange-700">Free for 7 days, then {selectedPlan.price}/{selectedPlan.period}. Cancel anytime in your account settings before the trial ends to avoid charges.</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleStartTrial}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
            size="lg"
          >
            {isProcessing ? 'Processing...' : 'Start Free Trial'}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};