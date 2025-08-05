import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CoupleData {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_nickname_for_user1?: string;
  user1_nickname_for_user2?: string;
  user2_nickname_for_user1?: string;
  user2_nickname_for_user2?: string;
  anniversary_date?: string;
  relationship_status?: 'dating' | 'engaged' | 'married' | 'partnered';
  created_at?: string;
  updated_at?: string;
}

interface ProfileData {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
}

interface UseCoupleDataReturn {
  coupleData: CoupleData | null;
  userProfile: ProfileData | null;
  partnerProfile: ProfileData | null;
  isCurrentUserUser1: boolean;
  getUserDisplayName: () => string;
  getPartnerDisplayName: () => string;
  updateNicknames: (userNickname: string, partnerNickname: string) => Promise<void>;
  loading: boolean;
}

export const useCoupleData = (): UseCoupleDataReturn => {
  const { user } = useAuth();
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const isCurrentUserUser1 = coupleData?.user1_id === user?.id;

  useEffect(() => {
    if (user?.id) {
      fetchCoupleData();
    }
  }, [user?.id]);

  // Add timeout fallback for loading state
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout reached, setting loading to false');
        setLoading(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const fetchCoupleData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get couple data - prioritize real partnerships over demo mode
      const { data: couples, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (coupleError) {
        console.error('Error fetching couple data:', coupleError);
      }

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

      if (couple) {
        // Get both profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', [couple.user1_id, couple.user2_id]);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        if (profiles) {
          const currentUserProfile = profiles.find(p => p.user_id === user.id);
          const partnerProfile = profiles.find(p => p.user_id !== user.id);
          
          setUserProfile(currentUserProfile || null);
          setPartnerProfile(partnerProfile || null);
        }
      }
    } catch (error) {
      console.error('Error fetching couple data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (): string => {
    if (!coupleData || !user?.id) return 'You';
    
    if (isCurrentUserUser1) {
      return coupleData.user1_nickname_for_user1 || userProfile?.display_name || 'You';
    } else {
      return coupleData.user2_nickname_for_user2 || userProfile?.display_name || 'You';
    }
  };

  const getPartnerDisplayName = (): string => {
    if (!coupleData || !user?.id) return 'Partner';
    
    if (isCurrentUserUser1) {
      return coupleData.user1_nickname_for_user2 || partnerProfile?.display_name || 'Partner';
    } else {
      return coupleData.user2_nickname_for_user1 || partnerProfile?.display_name || 'Partner';
    }
  };

  const updateNicknames = async (userNickname: string, partnerNickname: string) => {
    if (!coupleData || !user?.id) return;

    const updates: Partial<CoupleData> = {};
    
    if (isCurrentUserUser1) {
      updates.user1_nickname_for_user1 = userNickname;
      updates.user1_nickname_for_user2 = partnerNickname;
    } else {
      updates.user2_nickname_for_user2 = userNickname;
      updates.user2_nickname_for_user1 = partnerNickname;
    }

    await supabase
      .from('couples')
      .update(updates)
      .eq('id', coupleData.id);

    // Refresh data
    await fetchCoupleData();
  };

  return {
    coupleData,
    userProfile,
    partnerProfile,
    isCurrentUserUser1,
    getUserDisplayName,
    getPartnerDisplayName,
    updateNicknames,
    loading
  };
};