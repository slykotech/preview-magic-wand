import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Mail, ArrowLeft, Send, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const PartnerInvitation: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const handleSendInvite = async () => {
    if (!partnerEmail || !partnerName) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in both name and email fields.',
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to send invitations.',
      });
      return;
    }

    setIsSending(true);

    try {
      // Call the edge function to send invitation email
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          partnerEmail,
          partnerName,
          senderName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Your Partner',
          senderEmail: user.email
        }
      });

      if (error) {
        throw error;
      }

      setInviteSent(true);
      toast({
        title: 'Invitation Sent! 💕',
        description: `We've sent an invitation to ${partnerName} at ${partnerEmail}`,
      });

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send Invitation',
        description: 'Please check the email address and try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/subscription/payment')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-foreground">Invite Your Partner</h1>
            <p className="text-muted-foreground">Share Love Sync with your special someone</p>
          </div>
        </div>

        {!inviteSent ? (
          <>
            {/* Invitation Form */}
            <Card className="p-6 mb-6">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <UserPlus className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">Connect with Your Partner</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite your partner to join Love Sync and start building stronger connections together.
                  </p>
                </div>

                <div>
                  <Label htmlFor="partnerName">Partner's Name</Label>
                  <Input
                    id="partnerName"
                    placeholder="Enter your partner's name"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="partnerEmail">Partner's Email</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    placeholder="partner@example.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Benefits */}
            <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">When your partner joins:</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>💕 Sync your daily check-ins and moods</p>
                  <p>🎮 Play couple games together</p>
                  <p>📊 Track your relationship health score</p>
                  <p>💬 Share memories and messages</p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleSendInvite}
                disabled={isSending || !partnerEmail || !partnerName}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                size="lg"
              >
                {isSending ? (
                  'Sending Invitation...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleSkip}
                variant="ghost"
                className="w-full"
                disabled={isSending}
              >
                Invite Later
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <Card className="p-6 mb-6 text-center">
              <Mail className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Invitation Sent! 💕</h3>
              <p className="text-muted-foreground mb-4">
                We've sent an invitation to <strong>{partnerName}</strong> at <strong>{partnerEmail}</strong>
              </p>
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  They'll receive an email with instructions to join Love Sync and connect with you.
                </p>
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-4 mb-6">
              <h4 className="font-medium text-foreground mb-3">What happens next?</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Your partner will receive an email invitation</p>
                <p>2. They'll create their account and verify their email</p>
                <p>3. You'll both be automatically connected</p>
                <p>4. Start enjoying Love Sync together!</p>
              </div>
            </Card>

            {/* Action Button */}
            <Button 
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              size="lg"
            >
              Continue to Love Sync
            </Button>
          </>
        )}

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Having trouble? Contact support for help with partner invitations.
          </p>
        </div>
      </div>
    </div>
  );
};