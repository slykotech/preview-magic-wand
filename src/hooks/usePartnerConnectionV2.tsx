import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type ConnectionStatus = 'unpaired' | 'pending' | 'paired';
export type RelationshipStatus = 'dating' | 'engaged' | 'married' | 'partnered';

interface PartnerRequest {
  id: string;
  requester_id: string;
  requested_email: string;
  requested_user_id?: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface CoupleData {
  id: string;
  user1_id: string;
  user2_id: string;
  relationship_status: RelationshipStatus;
  anniversary_date?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileData {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
}

export const usePartnerConnectionV2 = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unpaired');
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileData | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<PartnerRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PartnerRequest[]>([]);

  // Load all connection data
  const loadConnectionData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      // Get couple data - prioritize real partnerships over demo mode
      const { data: couples } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Find the best couple record - prefer real partnerships over demo mode
      let couple = null;
      if (couples && couples.length > 0) {
        // First try to find a real partnership (user1_id !== user2_id)
        couple = couples.find(c => c.user1_id !== c.user2_id);
        // If no real partnership, use the most recent record
        if (!couple) {
          couple = couples[0];
        }
      }

      setCoupleData(couple);

      // Determine connection status
      if (couple) {
        // Check if it's demo mode (user paired with themselves)
        if (couple.user1_id === couple.user2_id) {
          setConnectionStatus('unpaired');
        } else {
          setConnectionStatus('paired');
          
          // Get partner profile
          const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
          const { data: partner } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', partnerId)
            .single();
          
          setPartnerProfile(partner);
        }
      } else {
        setConnectionStatus('unpaired');
      }

      // Get incoming requests
      const { data: incoming } = await supabase
        .from('partner_requests')
        .select('*')
        .or(`requested_email.eq.${user.email},requested_user_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setIncomingRequests(incoming || []);

      // Get outgoing requests
      const { data: outgoing } = await supabase
        .from('partner_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setOutgoingRequests(outgoing || []);

      // Update connection status based on requests
      if ((incoming && incoming.length > 0) || (outgoing && outgoing.length > 0)) {
        setConnectionStatus('pending');
      } else if (!couple || couple.user1_id === couple.user2_id) {
        // No pending requests and not paired (or in demo mode) - set to unpaired
        setConnectionStatus('unpaired');
      }

    } catch (error) {
      console.error('Error loading connection data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load your connection information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Send partner request
  const sendPartnerRequest = async (partnerEmail: string): Promise<boolean> => {
    if (!user?.id || !partnerEmail.trim()) return false;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(partnerEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return false;
    }

    // Check if trying to invite self
    if (partnerEmail.toLowerCase() === user.email?.toLowerCase()) {
      toast({
        title: "Cannot invite yourself",
        description: "You cannot send a partner request to your own email",
        variant: "destructive"
      });
      return false;
    }

    // Check if user is already connected (client-side check)
    if (connectionStatus === 'paired') {
      toast({
        title: "Already connected",
        description: "You are already connected with a partner. Remove your current partner first to connect with someone new.",
        variant: "destructive"
      });
      return false;
    }

    // Check if user has pending requests
    if (outgoingRequests.length > 0) {
      toast({
        title: "Request already sent",
        description: "You have already sent a partner request. Please wait for a response or cancel the existing request.",
        variant: "destructive"
      });
      return false;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-partner-connection', {
        body: {
          action: 'send_request',
          partnerEmail: partnerEmail.trim()
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data.success) {
        toast({
          title: "Request sent! 💕",
          description: data.message,
        });
        await loadConnectionData();
        return true;
      } else {
        console.error('Function returned error:', data.error);
        throw new Error(data.error || 'Failed to send request');
      }
    } catch (error: any) {
      console.error('Error sending partner request:', error);
      toast({
        title: "Failed to send request",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Accept partner request
  const acceptPartnerRequest = async (requestId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-partner-connection', {
        body: {
          action: 'accept_request',
          requestId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Request accepted! 💕",
          description: data.message,
        });
        await loadConnectionData();
        return true;
      } else {
        throw new Error(data.error || 'Failed to accept request');
      }
    } catch (error: any) {
      console.error('Error accepting partner request:', error);
      toast({
        title: "Failed to accept request",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Decline partner request
  const declinePartnerRequest = async (requestId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request declined",
        description: "The partner request has been declined",
      });
      await loadConnectionData();
      return true;
    } catch (error: any) {
      console.error('Error declining partner request:', error);
      toast({
        title: "Error declining request",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel outgoing request
  const cancelOutgoingRequest = async (requestId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your partner request has been cancelled",
      });
      await loadConnectionData();
      return true;
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error cancelling request",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Disconnect from partner
  const disconnectFromPartner = async (): Promise<boolean> => {
    if (!coupleData?.id) return false;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-partner-connection', {
        body: {
          action: 'remove_partner',
          coupleId: coupleData.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Partner disconnected",
          description: data.message,
        });
        await loadConnectionData();
        return true;
      } else {
        throw new Error(data.error || 'Failed to disconnect partner');
      }
    } catch (error: any) {
      console.error('Error disconnecting partner:', error);
      toast({
        title: "Failed to disconnect",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Update relationship details
  const updateRelationshipDetails = async (
    relationshipStatus: RelationshipStatus,
    anniversaryDate?: Date
  ): Promise<boolean> => {
    if (!coupleData?.id) return false;

    setIsProcessing(true);
    try {
      const updates: any = { relationship_status: relationshipStatus };
      if (anniversaryDate) {
        updates.anniversary_date = anniversaryDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('couples')
        .update(updates)
        .eq('id', coupleData.id);

      if (error) throw error;

      toast({
        title: "Relationship updated! 💕",
        description: "Your relationship details have been updated",
      });
      await loadConnectionData();
      return true;
    } catch (error: any) {
      console.error('Error updating relationship:', error);
      toast({
        title: "Update failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Load data on mount and user change
  useEffect(() => {
    if (user?.id) {
      loadConnectionData();
    }
  }, [user?.id]);

  return {
    loading,
    isProcessing,
    connectionStatus,
    coupleData,
    userProfile,
    partnerProfile,
    incomingRequests,
    outgoingRequests,
    sendPartnerRequest,
    acceptPartnerRequest,
    declinePartnerRequest,
    cancelOutgoingRequest,
    disconnectFromPartner,
    updateRelationshipDetails,
    refreshData: loadConnectionData
  };
};