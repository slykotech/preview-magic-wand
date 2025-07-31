import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface PartnerRequest {
  id: string;
  requester_id: string;
  requested_email: string;
  requested_user_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CoupleData {
  id: string;
  user1_id: string;
  user2_id: string;
  relationship_status: 'dating' | 'engaged' | 'married' | 'partnered';
  anniversary_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileData {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
}

export const usePartnerConnection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileData | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<PartnerRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PartnerRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to check if user is in demo mode (connected to themselves)
  const isDemoMode = coupleData?.user1_id === coupleData?.user2_id;
  
  // Helper to get partner ID
  const getPartnerId = () => {
    if (!coupleData || !user?.id || isDemoMode) return null;
    return coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id;
  };

  // Load all connection data
  const loadConnectionData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserProfile(profile);

      // Load couple data
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();

      setCoupleData(couple);

      // Load partner profile if exists
      if (couple && !isDemoMode) {
        const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
        const { data: partner } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', partnerId)
          .maybeSingle();

        setPartnerProfile(partner);
      } else {
        setPartnerProfile(null);
      }

      // Load incoming requests
      const { data: incoming } = await supabase
        .from('partner_requests')
        .select('*')
        .or(`requested_email.eq.${user.email},requested_user_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setIncomingRequests((incoming as PartnerRequest[]) || []);

      // Load outgoing requests
      const { data: outgoing } = await supabase
        .from('partner_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setOutgoingRequests((outgoing as PartnerRequest[]) || []);

    } catch (error) {
      console.error('Error loading connection data:', error);
      toast({
        title: "Error",
        description: "Failed to load connection data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Send partner request
  const sendPartnerRequest = async (partnerEmail: string): Promise<boolean> => {
    if (!user?.id || !partnerEmail.trim()) return false;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-partner-connection', {
        body: { 
          action: 'send_request',
          partnerEmail: partnerEmail.trim()
        }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Request Failed",
          description: data.error,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Partner Request Sent! 💕",
        description: data.message,
      });

      await loadConnectionData();
      return true;

    } catch (error) {
      console.error('Error sending partner request:', error);
      toast({
        title: "Error",
        description: "Failed to send partner request",
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

      if (!data.success) {
        toast({
          title: "Accept Failed",
          description: data.error,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Partner Request Accepted! 💕",
        description: data.message,
      });

      await loadConnectionData();
      return true;

    } catch (error) {
      console.error('Error accepting partner request:', error);
      toast({
        title: "Error",
        description: "Failed to accept partner request",
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
        title: "Request Declined",
        description: "Partner request has been declined",
      });

      await loadConnectionData();
      return true;

    } catch (error) {
      console.error('Error declining partner request:', error);
      toast({
        title: "Error",
        description: "Failed to decline partner request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove current partner connection
  const removePartnerConnection = async (): Promise<boolean> => {
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

      if (!data.success) {
        toast({
          title: "Remove Failed",
          description: data.error,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Partner Removed 💔",
        description: data.message,
      });

      await loadConnectionData();
      return true;

    } catch (error) {
      console.error('Error removing partner:', error);
      toast({
        title: "Error",
        description: "Failed to remove partner",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Update relationship details
  const updateRelationshipDetails = async (
    relationshipStatus: string,
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
        title: "Relationship Updated! 💕",
        description: "Your relationship details have been updated",
      });

      await loadConnectionData();
      return true;

    } catch (error) {
      console.error('Error updating relationship details:', error);
      toast({
        title: "Error",
        description: "Failed to update relationship details",
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
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your partner request has been cancelled",
      });

      await loadConnectionData();
      return true;

    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadConnectionData();
    }
  }, [user?.id]);

  return {
    // Data
    coupleData,
    userProfile,
    partnerProfile,
    incomingRequests,
    outgoingRequests,
    
    // State
    loading,
    isProcessing,
    isDemoMode,
    
    // Helper functions
    getPartnerId,
    
    // Actions
    sendPartnerRequest,
    acceptPartnerRequest,
    declinePartnerRequest,
    removePartnerConnection,
    updateRelationshipDetails,
    cancelOutgoingRequest,
    loadConnectionData
  };
};