import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
interface RecentTask {
  id: string;
  card_prompt: string;
  card_category: string;
  response_type: string;
  response_text?: string;
  user_name: string;
  responded_at: string;
}
export const RecentTasks: React.FC = () => {
  const {
    user
  } = useAuth();
  const {
    coupleData
  } = useCoupleData();
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user || !coupleData) return;
    const fetchRecentTasks = async () => {
      try {
        // Get recent responses from both partners
        const {
          data,
          error
        } = await supabase.from('card_responses').select(`
            id,
            response_text,
            response_type,
            responded_at,
            user_id,
            card_id
          `).order('responded_at', {
          ascending: false
        }).limit(10);
        if (error) throw error;

        // Get card details for each response
        const tasksWithNames = [];
        for (const response of data || []) {
          const {
            data: cardData
          } = await supabase.from('deck_cards').select('prompt, category').eq('id', response.card_id).single();
          if (cardData) {
            tasksWithNames.push({
              id: response.id,
              card_prompt: cardData.prompt,
              card_category: cardData.category,
              response_type: response.response_type,
              response_text: response.response_text,
              user_name: response.user_id === user.id ? 'You' : 'Partner',
              responded_at: response.responded_at
            });
          }
        }
        setRecentTasks(tasksWithNames);
      } catch (error) {
        console.error('Failed to fetch recent tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentTasks();

    // Subscribe to new responses
    const channel = supabase.channel('recent-tasks').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'card_responses'
    }, () => {
      fetchRecentTasks(); // Refresh when new response added
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, coupleData]);
  if (loading) {
    return;
  }
  return null;
};