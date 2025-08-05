import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type ConnectionStatus = 'unpaired' | 'pending' | 'paired';

interface PartnerRequest {
  id: string;
  requester_id: string;
  requested_email: string;
  requested_user_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  relationship_status: string;
  anniversary_date: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePartnerConnectionV2 {
  connectionStatus: ConnectionStatus;
  couple: Couple | null;
  coupleData: Couple | null; // Backward compatibility
  incomingRequests: PartnerRequest[];
  outgoingRequests: PartnerRequest[];
  isLoading: boolean;
  loading: boolean; // Backward compatibility
  isProcessing: boolean; // For legacy components
  userProfile: any; // Backward compatibility
  partnerProfile: any; // Backward compatibility
  sendPartnerRequest: (email: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  acceptPartnerRequest: (requestId: string) => Promise<boolean>; // Backward compatibility
  declineRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  declinePartnerRequest: (requestId: string) => Promise<boolean>; // Backward compatibility
  cancelOutgoingRequest: (requestId: string) => Promise<boolean>; // Backward compatibility
  removePartner: () => Promise<{ success: boolean; error?: string }>;
  disconnectFromPartner: () => Promise<boolean>; // Backward compatibility
  updateRelationshipDetails: (status: any, date?: any) => Promise<boolean>; // Backward compatibility
  refreshStatus: () => Promise<void>;
  refreshData: () => Promise<void>; // Backward compatibility
  isDemo: boolean;
}

export const usePartnerConnectionV2 = (): UsePartnerConnectionV2 => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unpaired');
  const [couple, setCouple] = useState<Couple | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<PartnerRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PartnerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);

  const isDemo = couple?.user1_id === couple?.user2_id;

  // Rate limiting helper
  const checkRateLimit = () => {
    const now = Date.now();
    if (now - lastRequestTime < 30000) { // 30 seconds
      toast({
        title: "Too many requests",
        description: "Please wait 30 seconds before sending another request",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  // Refresh connection status
  const refreshStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('partner-connection-v2', {
        body: { action: 'check_status' }
      });

      if (error) {
        console.error('Error checking status:', error);
        return;
      }

      if (data.success) {
        setConnectionStatus(data.status);
        setCouple(data.couple);
        setIncomingRequests(data.incoming_requests || []);
        setOutgoingRequests(data.outgoing_requests || []);
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send partner request
  const sendPartnerRequest = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!checkRateLimit()) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    // Check if trying to invite self
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return { success: false, error: 'Cannot send partner request to yourself' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('partner-connection-v2', {
        body: { 
          action: 'send_request',
          email: email.toLowerCase().trim()
        }
      });

      setLastRequestTime(Date.now());

      if (error) {
        console.error('Error sending request:', error);
        return { success: false, error: 'Failed to send request' };
      }

      if (data.success) {
        toast({
          title: "Request sent! 💌",
          description: data.message,
        });
        
        // Refresh status to show pending request
        await refreshStatus();
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to send request' };
      }
    } catch (error) {
      console.error('Error sending partner request:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, [user, toast, refreshStatus, lastRequestTime]);

  // Accept partner request
  const acceptRequest = useCallback(async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('partner-connection-v2', {
        body: { 
          action: 'accept_request',
          request_id: requestId
        }
      });

      if (error) {
        console.error('Error accepting request:', error);
        return { success: false, error: 'Failed to accept request' };
      }

      if (data.success) {
        toast({
          title: "Connected! 💕",
          description: data.message,
        });
        
        // Refresh status to show new connection
        await refreshStatus();
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to accept request' };
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, [user, toast, refreshStatus]);

  // Decline partner request
  const declineRequest = useCallback(async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('partner-connection-v2', {
        body: { 
          action: 'decline_request',
          request_id: requestId
        }
      });

      if (error) {
        console.error('Error declining request:', error);
        return { success: false, error: 'Failed to decline request' };
      }

      if (data.success) {
        toast({
          title: "Request declined",
          description: data.message,
        });
        
        // Refresh status
        await refreshStatus();
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to decline request' };
      }
    } catch (error) {
      console.error('Error declining request:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, [user, toast, refreshStatus]);

  // Remove partner connection
  const removePartner = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('partner-connection-v2', {
        body: { action: 'remove_partner' }
      });

      if (error) {
        console.error('Error removing partner:', error);
        return { success: false, error: 'Failed to remove partner' };
      }

      if (data.success) {
        toast({
          title: "Partner removed",
          description: data.message,
        });
        
        // Refresh status
        await refreshStatus();
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to remove partner' };
      }
    } catch (error) {
      console.error('Error removing partner:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, [user, toast, refreshStatus]);

  // Legacy compatibility functions
  const acceptPartnerRequest = useCallback(async (requestId: string): Promise<boolean> => {
    const result = await acceptRequest(requestId);
    return result.success;
  }, [acceptRequest]);

  const declinePartnerRequest = useCallback(async (requestId: string): Promise<boolean> => {
    const result = await declineRequest(requestId);
    return result.success;
  }, [declineRequest]);

  const cancelOutgoingRequest = useCallback(async (requestId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your partner request has been cancelled",
      });
      await refreshStatus();
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
  }, [toast, refreshStatus]);

  const disconnectFromPartner = useCallback(async (): Promise<boolean> => {
    const result = await removePartner();
    return result.success;
  }, [removePartner]);

  const updateRelationshipDetails = useCallback(async (status: any, date?: any): Promise<boolean> => {
    if (!couple?.id) return false;

    setIsProcessing(true);
    try {
      const updates: any = { relationship_status: status };
      if (date) {
        updates.anniversary_date = date instanceof Date ? date.toISOString().split('T')[0] : date;
      }

      const { error } = await supabase
        .from('couples')
        .update(updates)
        .eq('id', couple.id);

      if (error) throw error;

      toast({
        title: "Relationship updated! 💕",
        description: "Your relationship details have been updated",
      });
      await refreshStatus();
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
  }, [couple, toast, refreshStatus]);

  // Set up real-time subscriptions for partner requests and couples
  useEffect(() => {
    if (!user) return;

    // Subscribe to partner request changes
    const requestsChannel = supabase
      .channel('partner-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_requests',
          filter: `requested_user_id=eq.${user.id}`
        },
        () => {
          console.log('Partner request changed, refreshing...');
          refreshStatus();
        }
      )
      .subscribe();

    // Subscribe to couple changes
    const couplesChannel = supabase
      .channel('couples-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `user1_id=eq.${user.id}`
        },
        () => {
          console.log('Couple data changed, refreshing...');
          refreshStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `user2_id=eq.${user.id}`
        },
        () => {
          console.log('Couple data changed, refreshing...');
          refreshStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(couplesChannel);
    };
  }, [user, refreshStatus]);

  // Initial load and user change handler
  useEffect(() => {
    if (user) {
      refreshStatus();
    } else {
      // Reset state when user logs out
      setConnectionStatus('unpaired');
      setCouple(null);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setIsLoading(false);
    }
  }, [user, refreshStatus]);

  // Auto-create demo connection for unpaired users
  useEffect(() => {
    if (user && connectionStatus === 'unpaired' && !couple && !isLoading) {
      // Create demo connection automatically
      const createDemoConnection = async () => {
        try {
          const { error } = await supabase
            .from('couples')
            .insert({
              user1_id: user.id,
              user2_id: user.id, // Demo connection to self
              relationship_status: 'dating'
            });

          if (!error) {
            refreshStatus();
          }
        } catch (error) {
          console.log('Demo connection already exists or error creating:', error);
        }
      };

      createDemoConnection();
    }
  }, [user, connectionStatus, couple, isLoading, refreshStatus]);

  return {
    connectionStatus,
    couple,
    coupleData: couple, // Backward compatibility
    incomingRequests,
    outgoingRequests,
    isLoading,
    loading: isLoading, // Backward compatibility
    isProcessing,
    userProfile,
    partnerProfile,
    sendPartnerRequest,
    acceptRequest,
    acceptPartnerRequest, // Backward compatibility
    declineRequest,
    declinePartnerRequest, // Backward compatibility
    cancelOutgoingRequest, // Backward compatibility
    removePartner,
    disconnectFromPartner, // Backward compatibility
    updateRelationshipDetails, // Backward compatibility
    refreshStatus,
    refreshData: refreshStatus, // Backward compatibility
    isDemo
  };
};