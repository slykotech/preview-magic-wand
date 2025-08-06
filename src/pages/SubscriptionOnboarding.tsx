import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Shield, CreditCard, Star, Gift, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { validateCard, formatCardNumber, formatExpiryDate, getCardBrandName, isValidCardNumber, isValidExpiryDate, isValidCVV, isValidCardholderName } from '@/utils/cardValidation';

interface PaymentDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export const SubscriptionOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startTrial, premiumAccess, loading } = useEnhancedSubscription();
  const { toast } = useToast();
  const [step, setStep] = useState<'plan' | 'payment'>('plan');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardErrors, setCardErrors] = useState<string[]>([]);

  // Real-time validation states
  const [fieldValidation, setFieldValidation] = useState({
    cardNumber: { isValid: false, touched: false },
    expiryDate: { isValid: false, touched: false },
    cvv: { isValid: false, touched: false },
    cardholderName: { isValid: false, touched: false }
  });

  // Redirect to dashboard if user already has premium access
  useEffect(() => {
    if (!loading && premiumAccess.has_access) {
      navigate('/dashboard');
    }
  }, [loading, premiumAccess.has_access, navigate]);

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

  const handleStartTrial = () => {
    setStep('payment');
  };

  const handlePaymentSubmit = async () => {
    // Clear previous errors
    setCardErrors([]);
    
    // Validate card details using our validation utility
    const validation = validateCard(paymentDetails);
    
    if (!validation.isValid) {
      setCardErrors(validation.errors);
      toast({
        variant: "destructive",
        description: "Please fix the card validation errors below"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Get card brand for better integration
      const cardBrand = getCardBrandName(paymentDetails.cardNumber);
      
      const cardDetails = {
        last_four: paymentDetails.cardNumber.replace(/\D/g, '').slice(-4),
        brand: cardBrand.toLowerCase()
      };
      
      const result = await startTrial(cardDetails);
      if (result.success) {
        toast({
          description: "Welcome to Love Sync Premium! Your 7-day free trial has started."
        });
        navigate('/dashboard');
      } else {
        toast({
          variant: "destructive",
          description: result.error || "Failed to start trial. Please try again."
        });
      }
    } catch (error) {
      console.error('Trial start error:', error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Real-time field validation
  const validateField = (fieldName: keyof PaymentDetails, value: string) => {
    let isValid = false;
    
    switch (fieldName) {
      case 'cardNumber':
        isValid = value.trim() !== '' && isValidCardNumber(value);
        break;
      case 'expiryDate':
        isValid = value.trim() !== '' && isValidExpiryDate(value);
        break;
      case 'cvv':
        isValid = value.trim() !== '' && isValidCVV(value, paymentDetails.cardNumber);
        break;
      case 'cardholderName':
        isValid = value.trim() !== '' && isValidCardholderName(value);
        break;
    }
    
    setFieldValidation(prev => ({
      ...prev,
      [fieldName]: { isValid, touched: true }
    }));
  };

  // Helper function to get field icon
  const getFieldIcon = (fieldName: keyof PaymentDetails) => {
    const field = fieldValidation[fieldName];
    if (!field.touched) return null;
    
    return field.isValid ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <X className="w-4 h-4 text-red-500" />
    );
  };


  if (loading) {
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
        {step === 'plan' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center text-white space-y-2 pt-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="w-8 h-8 text-yellow-400" />
                <h1 className="text-2xl font-bold">Love Sync Premium</h1>
              </div>
              <p className="text-white/80">Unlock the full power of your relationship</p>
            </div>

            {/* Plan Card */}
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-xl">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Gift className="w-3 h-3 mr-1" />
                    7-Day Free Trial
                  </Badge>
                  <h2 className="text-xl font-bold">Premium Plan</h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-primary">$9.99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Cancel anytime during trial</p>
                </div>

                <div className="space-y-3 text-left">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-accent/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium">100% Risk-Free</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancel anytime during your 7-day trial and you won't be charged
                  </p>
                </div>

                <Button 
                  onClick={handleStartTrial}
                  className="w-full bg-gradient-primary text-white hover:shadow-glow transition-all py-3"
                  size="lg"
                >
                  Start 7-Day Free Trial
                  <Star className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>

            {/* Footer */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="text-white/70 hover:text-white"
              >
                Continue with Free Version
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center text-white space-y-2 pt-8">
              <CreditCard className="w-8 h-8 text-white mx-auto" />
              <h1 className="text-2xl font-bold">Payment Method</h1>
              <p className="text-white/80">Secure your 7-day free trial</p>
            </div>

            {/* Payment Form */}
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-xl">
              <div className="space-y-4">
                <div className="bg-accent/50 p-4 rounded-lg text-center">
                  <p className="text-sm font-medium">Free for 7 days</p>
                  <p className="text-xs text-muted-foreground">
                    You'll be charged $9.99/month after your trial ends. Cancel anytime.
                  </p>
                </div>

                {/* Show validation errors */}
                {cardErrors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                      <AlertCircle className="w-4 h-4" />
                      Please fix the following errors:
                    </div>
                    <ul className="text-sm text-destructive space-y-1">
                      {cardErrors.map((error, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-destructive rounded-full"></span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <div className="relative">
                      <Input
                        id="cardholderName"
                        placeholder="John Doe"
                        value={paymentDetails.cardholderName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPaymentDetails(prev => ({ ...prev, cardholderName: value }));
                          validateField('cardholderName', value);
                        }}
                        className="mt-1 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon('cardholderName')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={paymentDetails.cardNumber}
                        onChange={(e) => {
                          const value = formatCardNumber(e.target.value);
                          setPaymentDetails(prev => ({ ...prev, cardNumber: value }));
                          validateField('cardNumber', value);
                        }}
                        maxLength={23} // Increased for formatting
                        className="mt-1 pr-20"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        {getFieldIcon('cardNumber')}
                        {paymentDetails.cardNumber && (
                          <span className="text-xs text-muted-foreground">
                            {getCardBrandName(paymentDetails.cardNumber)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <div className="relative">
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={paymentDetails.expiryDate}
                          onChange={(e) => {
                            const value = formatExpiryDate(e.target.value);
                            setPaymentDetails(prev => ({ ...prev, expiryDate: value }));
                            validateField('expiryDate', value);
                          }}
                          maxLength={5}
                          className="mt-1 pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon('expiryDate')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <div className="relative">
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={paymentDetails.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setPaymentDetails(prev => ({ ...prev, cvv: value }));
                            validateField('cvv', value);
                          }}
                          maxLength={4}
                          className="mt-1 pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon('cvv')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Your payment information is encrypted and secure</span>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handlePaymentSubmit}
                    disabled={isProcessing}
                    className="w-full bg-gradient-primary text-white hover:shadow-glow transition-all py-3"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Crown className="w-4 h-4 mr-2 animate-spin" />
                        Starting Trial...
                      </>
                    ) : (
                      <>
                        Start Free Trial
                        <Crown className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="ghost" 
                    onClick={() => setStep('plan')}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    Back to Plan
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};