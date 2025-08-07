import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Send, Check, Clock, Mail, Copy } from 'lucide-react';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface PartnerInvitation {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  invitation_token?: string;
}

export const PartnerInvitationManager: React.FC = () => {
  const { user } = useAuth();
  const { premiumAccess, grantPartnerAccess } = useEnhancedSubscription();
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitations, setInvitations] = useState<PartnerInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingInvitations, setFetchingInvitations] = useState(true);

  // Fetch existing invitations
  useEffect(() => {
    if (user && premiumAccess.has_access) {
      fetchInvitations();
    }
  }, [user, premiumAccess.has_access]);

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('partner_invitations')
        .select('*')
        .eq('premium_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as PartnerInvitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setFetchingInvitations(false);
    }
  };

  const sendInvitation = async () => {
    if (!user || !inviteEmail.trim()) return;

    setLoading(true);
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteEmail)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return;
      }

      // Check if email is already invited
      const existingInvitation = invitations.find(
        inv => inv.invited_email === inviteEmail && inv.status === 'pending'
      );

      if (existingInvitation) {
        toast({
          title: "Already Invited",
          description: "This email has already been invited.",
          variant: "destructive"
        });
        return;
      }

      // Create invitation record
      const { data, error } = await supabase
        .from('partner_invitations')
        .insert({
          premium_user_id: user.id,
          invited_email: inviteEmail.trim(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitation_id: data.id,
          invited_email: inviteEmail.trim(),
          premium_user_email: user.email,
          invitation_token: data.invitation_token
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't fail the entire process if email fails
      }

      toast({
        title: "Invitation Sent! 📧",
        description: `Premium access invitation sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      await fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Invitation Failed",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = async (invitation: PartnerInvitation) => {
    const inviteUrl = `${window.location.origin}/invite/${invitation.invitation_token || invitation.id}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link Copied! 📋",
        description: "Invitation link copied to clipboard.",
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Link Copied! 📋",
        description: "Invitation link copied to clipboard.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-100 text-green-800">
          <Check className="w-3 h-3 mr-1" />
          Accepted
        </Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!premiumAccess.has_access) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Share Premium Access</h3>
          <p className="text-muted-foreground">
            Upgrade to premium to share access with your partner
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Send New Invitation */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Share Premium Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Invite your partner to share your premium subscription at no extra cost.
          </p>
          
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="Enter your partner's email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendInvitation()}
              disabled={loading}
            />
            <Button 
              onClick={sendInvitation}
              disabled={loading || !inviteEmail.trim()}
              className="shrink-0"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2">⭐</div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitation History */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchingInvitations ? (
            <div className="text-center py-6">
              <div className="animate-spin text-2xl mb-2">💕</div>
              <p className="text-muted-foreground">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-6">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invitations sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border border-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{invitation.invited_email}</span>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Sent {new Date(invitation.created_at).toLocaleDateString()}
                      {invitation.status === 'pending' && (
                        <span className="ml-2">
                          • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {invitation.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationLink(invitation)}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};