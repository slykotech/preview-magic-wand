import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Lock, ArrowLeft, Check } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface SelectedPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  originalPrice?: number;
  description: string;
}

export const SubscriptionPayment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: user?.email || '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });

  useEffect(() => {
    // Load selected plan from localStorage
    const savedPlan = localStorage.getItem('selectedPlan');
    if (savedPlan) {
      try {
        setSelectedPlan(JSON.parse(savedPlan));
      } catch (error) {
        console.error('Error parsing saved plan:', error);
        navigate('/subscription/plans');
      }
    } else {
      // No plan selected, redirect to plans
      navigate('/subscription/plans');
    }
  }, [navigate]);

  useEffect(() => {
    // Redirect non-authenticated users to auth
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('billingAddress.')) {
      const addressField = field.replace('billingAddress.', '');
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
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

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      handleInputChange('cardNumber', formatted);
    }
  };

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiryDate(value);
    if (formatted.length <= 5) {
      handleInputChange('expiryDate', formatted);
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'cardNumber',
      'expiryDate', 
      'cvv',
      'cardholderName',
      'email'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Error",
          description: `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: "destructive"
        });
        return false;
      }
    }

    // Basic card number validation (remove spaces and check length)
    const cardNumberClean = formData.cardNumber.replace(/\s/g, '');
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      toast({
        title: "Error",
        description: "Please enter a valid card number",
        variant: "destructive"
      });
      return false;
    }

    // CVV validation
    if (formData.cvv.length < 3 || formData.cvv.length > 4) {
      toast({
        title: "Error",
        description: "Please enter a valid CVV",
        variant: "destructive"
      });
      return false;
    }

    // Expiry date validation
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(formData.expiryDate)) {
      toast({
        title: "Error",
        description: "Please enter a valid expiry date (MM/YY)",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedPlan) return;

    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store trial activation data
      const trialData = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        period: selectedPlan.period,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        cardLast4: formData.cardNumber.slice(-4),
        status: 'trial'
      };
      
      localStorage.setItem('trialData', JSON.stringify(trialData));
      localStorage.removeItem('selectedPlan'); // Clean up
      
      toast({
        title: "Success",
        description: "🎉 Payment verified! Your free trial is now active!"
      });
      
      // Navigate to partner invitation
      navigate('/subscription/partner-invite');
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Error",
        description: "Payment failed. Please check your details and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/subscription/plans');
  };

  if (!user || !selectedPlan) {
    return null; // Will redirect
  }

  const calculatedTotal = selectedPlan.price;
  const savings = selectedPlan.originalPrice ? (selectedPlan.originalPrice - selectedPlan.price) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <GradientHeader 
        title="Complete Your Order"
        subtitle="Start your 7-day free trial with secure payment verification"
        icon="💳"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Card Information */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={formData.expiryDate}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={formData.cvv}
                          onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        value={formData.cardholderName}
                        onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Contact Information</h3>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Security Notice */}
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>Your payment information is secure and encrypted</span>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Start Free Trial'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{selectedPlan.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${selectedPlan.price.toFixed(2)}</div>
                    {selectedPlan.period === 'year' && (
                      <div className="text-sm text-muted-foreground">
                        ${(selectedPlan.price / 12).toFixed(2)}/month
                      </div>
                    )}
                  </div>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-sm">Annual Savings</span>
                    <span className="font-medium">-${savings.toFixed(2)}</span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${calculatedTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-medium">
                    <span>Total</span>
                    <span>${calculatedTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Badge className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
                  <Check className="w-4 h-4 mr-2" />
                  7-Day Free Trial Included
                </Badge>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Trial Details</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Free for 7 days starting today</li>
                    <li>• Cancel anytime during trial</li>
                    <li>• No charges until trial ends</li>
                    <li>• Full access to all features</li>
                  </ul>
                </div>

                <p className="text-xs text-muted-foreground">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy. 
                  Your subscription will begin after the 7-day free trial period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};