import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CreditCard, Shield, Clock, ArrowRight } from 'lucide-react';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { toast } from '@/hooks/use-toast';

interface EnhancedTrialFlowProps {
  onTrialStarted?: () => void;
  onSkip?: () => void;
  selectedPlan?: {
    id: string;
    name: string;
    price: string;
    period: string;
  };
}

export const EnhancedTrialFlow = ({ onTrialStarted, onSkip, selectedPlan }: EnhancedTrialFlowProps) => {
  const { startTrial, loading } = useEnhancedSubscription();
  const [step, setStep] = useState(1);
  const [skipPayment, setSkipPayment] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    name: ''
  });

  const handleStartTrial = async () => {
    try {
      const result = await startTrial(skipPayment ? undefined : {
        cardNumber: cardDetails.cardNumber,
        expiryDate: cardDetails.expiryDate,
        cvv: cardDetails.cvv,
        cardBrand: getCardBrand(cardDetails.cardNumber)
      });

      if (result.success) {
        onTrialStarted?.();
        toast({
          title: 'Trial Started! 🎉',
          description: 'Welcome to 7 days of premium features!'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Trial Start Failed',
        description: error.message || 'Unable to start trial. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getCardBrand = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'Mastercard';
    if (number.startsWith('3')) return 'American Express';
    return 'Unknown';
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2');
  };

  if (step === 1) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full mb-4 mx-auto">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Start Your Free Trial</CardTitle>
          <p className="text-muted-foreground mt-2">
            Get 7 days of full premium access, completely free
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-primary/5 rounded-lg">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">7 Days Free</h3>
              <p className="text-sm text-muted-foreground">Full access to everything</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">No Risk</h3>
              <p className="text-sm text-muted-foreground">Cancel anytime</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">All Features</h3>
              <p className="text-sm text-muted-foreground">Unlimited everything</p>
            </div>
          </div>


          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-primary-glow"
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            {onSkip && (
              <Button variant="ghost" onClick={onSkip}>
                Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Information
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Secure your trial - no charges for 7 days
        </p>
        <Badge variant="secondary" className="mx-auto">
          {selectedPlan ? `${selectedPlan.price}/${selectedPlan.period} after trial` : '$9.99/month after trial'}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <Input
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={cardDetails.cardNumber}
            onChange={(e) => setCardDetails(prev => ({
              ...prev,
              cardNumber: formatCardNumber(e.target.value)
            }))}
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              placeholder="MM/YY"
              value={cardDetails.expiryDate}
              onChange={(e) => setCardDetails(prev => ({
                ...prev,
                expiryDate: formatExpiryDate(e.target.value)
              }))}
              maxLength={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={cardDetails.cvv}
              onChange={(e) => setCardDetails(prev => ({
                ...prev,
                cvv: e.target.value.replace(/\D/g, '')
              }))}
              maxLength={4}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Cardholder Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={cardDetails.name}
            onChange={(e) => setCardDetails(prev => ({
              ...prev,
              name: e.target.value
            }))}
          />
        </div>

        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full bg-gradient-to-r from-primary to-primary-glow"
            onClick={handleStartTrial}
            disabled={loading || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv}
          >
            {loading ? 'Starting Trial...' : 'Start 7-Day Free Trial'}
          </Button>
          
          <Button variant="outline" size="sm" className="w-full" onClick={() => setStep(1)}>
            Back
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>🔒 Secure & encrypted • No charges for 7 days</p>
          <p>Cancel anytime before trial ends</p>
        </div>
      </CardContent>
    </Card>
  );
};