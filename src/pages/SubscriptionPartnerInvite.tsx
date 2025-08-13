import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Share2, Heart, Mail, MessageSquare, Copy, CheckCircle, ArrowRight } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export const SubscriptionPartnerInvite: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    // Redirect non-authenticated users to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // Generate invite link
    const baseUrl = window.location.origin;
    const inviteToken = generateInviteToken();
    setInviteLink(`${baseUrl}/accept-invitation?token=${inviteToken}&from=${encodeURIComponent(user.email || '')}`);
  }, [user, navigate]);

  const generateInviteToken = () => {
    // Generate a simple invite token (in production, this should be more secure)
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!partnerEmail) {
      toast({
        title: "Error",
        description: "Please enter your partner's email address",
        variant: "destructive"
      });
      return;
    }

    if (!isValidEmail(partnerEmail)) {
      toast({
        title: "Error", 
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate sending invite email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store invite data
      const inviteData = {
        partnerEmail,
        inviteLink,
        customMessage,
        sentAt: new Date().toISOString(),
        status: 'sent'
      };
      
      localStorage.setItem('partnerInvite', JSON.stringify(inviteData));
      
      setInviteSent(true);
      toast({
        title: "Success",
        description: `🎉 Invitation sent to ${partnerEmail}!`
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast({
        title: "Success",
        description: "Invite link copied to clipboard!"
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    });
  };

  const handleSkipForNow = () => {
    // Store that user skipped partner invitation
    localStorage.setItem('skippedPartnerInvite', 'true');
    navigate('/dashboard');
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <GradientHeader 
        title="Invite Your Partner"
        subtitle="Share your Love Story premium access and start connecting"
        icon="💕"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {!inviteSent ? (
            <>
              {/* Premium Access Notice */}
              <Card className="mb-6 bg-gradient-to-r from-green-100 to-emerald-100 border-green-200">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-200 rounded-full mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    🎉 Premium Access Activated!
                  </h3>
                  <p className="text-green-700">
                    Your free trial is active. Invite your partner to share all premium features together.
                  </p>
                </CardContent>
              </Card>

              {/* Invite Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Send Invitation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendInvite} className="space-y-6">
                    <div>
                      <Label htmlFor="partnerEmail">Partner's Email Address</Label>
                      <Input
                        id="partnerEmail"
                        type="email"
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="your.partner@example.com"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="customMessage">Personal Message (Optional)</Label>
                      <textarea
                        id="customMessage"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Add a personal message to your invitation..."
                        className="w-full mt-1 min-h-[100px] p-3 border border-input rounded-md bg-background text-sm"
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {customMessage.length}/500 characters
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? 'Sending Invitation...' : 'Send Invitation'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Alternative Sharing */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Share2 className="w-5 h-5 mr-2" />
                    Or Share Invite Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="inviteLink">Invitation Link</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        id="inviteLink"
                        value={inviteLink}
                        readOnly
                        className="bg-muted"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleCopyLink}
                        className="px-3"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center justify-center"
                      onClick={() => {
                        const message = `Hi! I'd love for you to join me on Love Story - an app that helps couples connect and grow together. Join me with this link: ${inviteLink}`;
                        window.open(`sms:?body=${encodeURIComponent(message)}`);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Text Message
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex items-center justify-center"
                      onClick={() => {
                        const subject = 'Join me on Love Story!';
                        const body = `Hi!\n\nI'd love for you to join me on Love Story - an app that helps couples connect and grow together.\n\nJoin me with this link: ${inviteLink}\n\nLooking forward to connecting with you!\n\n${customMessage}`;
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Skip Option */}
              <div className="text-center space-y-4">
                <Button 
                  variant="ghost" 
                  onClick={handleSkipForNow}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Skip for now, I'll invite them later
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  You can always invite your partner later from your profile settings.
                </p>
              </div>
            </>
          ) : (
            /* Invitation Sent Success */
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Invitation Sent! 🎉</h2>
                <p className="text-muted-foreground mb-6">
                  We've sent an invitation to <strong>{partnerEmail}</strong>. 
                  They'll receive an email with instructions to join you on Love Story.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Your partner will receive an email invitation</li>
                    <li>• They can create an account using the invite link</li>
                    <li>• Once they join, you'll both have access to all features</li>
                    <li>• You can start playing games and connecting together</li>
                  </ul>
                </div>

                <Button 
                  size="lg" 
                  onClick={handleContinueToDashboard}
                  className="px-8"
                >
                  Continue to Love Story
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Your partner can also find the invite link in your profile if they need it again.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Benefits Reminder */}
          <Card className="mt-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <CardContent className="p-6">
              <h3 className="font-semibold flex items-center mb-3">
                <Heart className="w-5 h-5 mr-2 text-pink-500" />
                Why Love Story is better together
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li>• Play interactive couple games</li>
                  <li>• Share memories and moments</li>
                  <li>• Get relationship insights together</li>
                </ul>
                <ul className="space-y-2">
                  <li>• Real-time messaging and connection</li>
                  <li>• Plan dates and activities</li>
                  <li>• Track your relationship growth</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};