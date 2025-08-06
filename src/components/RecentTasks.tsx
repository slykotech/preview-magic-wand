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
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !coupleData) return;

    const fetchRecentTasks = async () => {
      try {
        // Get recent responses from both partners
        const { data, error } = await supabase
          .from('card_responses')
          .select(`
            id,
            response_text,
            response_type,
            responded_at,
            user_id,
            card_id
          `)
          .order('responded_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Get card details for each response
        const tasksWithNames = [];
        for (const response of data || []) {
          const { data: cardData } = await supabase
            .from('deck_cards')
            .select('prompt, category')
            .eq('id', response.card_id)
            .single();

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
    const channel = supabase
      .channel('recent-tasks')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'card_responses'
        }, 
        () => {
          fetchRecentTasks(); // Refresh when new response added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, coupleData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {recentTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No completed tasks yet. Start playing to see your history!
          </p>
        ) : (
          recentTasks.map(task => (
            <div key={task.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{task.card_prompt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {task.card_category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.response_type}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>{task.user_name}</p>
                  <p>{formatDistanceToNow(new Date(task.responded_at), { addSuffix: true })}</p>
                </div>
              </div>
              
              {task.response_type === 'text' && task.response_text && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                  <p className="italic">"{task.response_text}"</p>
                </div>
              )}
              
              {task.response_type === 'photo' && task.response_text && (
                <div className="mt-2">
                  <img
                    src={`${supabase.storage.from('card-responses').getPublicUrl(task.response_text).data.publicUrl}`}
                    alt="Response"
                    className="max-h-20 rounded border"
                  />
                </div>
              )}
              
              {task.response_type === 'action' && (
                <div className="mt-2 text-sm text-green-600">
                  ✅ Action completed
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};