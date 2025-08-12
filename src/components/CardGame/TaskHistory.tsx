import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TaskHistoryItem {
  id: string;
  card_id: string;
  user_id: string;
  response_text: string | null;
  response_photo_url: string | null;
  response_type: 'text' | 'photo' | 'action';
  responded_at: string;
  time_taken_seconds: number | null;
  card_prompt: string;
  card_category: string;
  user_name: string;
}

interface TaskHistoryProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({ sessionId, isOpen, onClose }) => {
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchTaskHistory();
    }
  }, [isOpen, sessionId]);

  const fetchTaskHistory = async () => {
    setLoading(true);
    try {
      // First get the responses
      const { data: responses, error } = await supabase
        .from('card_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('responded_at', { ascending: false });

      if (error) throw error;

      // Then get card details and user names separately
      const formattedHistory: TaskHistoryItem[] = [];
      
      for (const response of responses || []) {
        // Get card details
        const { data: cardData } = await supabase
          .from('deck_cards')
          .select('prompt, category')
          .eq('id', response.card_id)
          .single();

        // Get user name from profiles or use fallback
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', response.user_id)
          .single();

        formattedHistory.push({
          id: response.id,
          card_id: response.card_id,
          user_id: response.user_id,
          response_text: response.response_text,
          response_photo_url: response.response_photo_url,
          response_type: response.response_type as 'text' | 'photo' | 'action',
          responded_at: response.responded_at,
          time_taken_seconds: response.time_taken_seconds,
          card_prompt: cardData?.prompt || 'Unknown task',
          card_category: cardData?.category || 'Unknown',
          user_name: profileData?.display_name || 'Partner'
        });
      }

      setTaskHistory(formattedHistory);
    } catch (error) {
      console.error('Failed to fetch task history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'romantic': 'bg-pink-100 text-pink-800 border-pink-200',
      'intimate': 'bg-purple-100 text-purple-800 border-purple-200',
      'flirty': 'bg-red-100 text-red-800 border-red-200',
      'memory': 'bg-blue-100 text-blue-800 border-blue-200',
      'future': 'bg-green-100 text-green-800 border-green-200',
      'funny': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'spicy': 'bg-orange-100 text-orange-800 border-orange-200',
      'growth': 'bg-teal-100 text-teal-800 border-teal-200',
      'daily': 'bg-gray-100 text-gray-800 border-gray-200'
    } as const;
    return colors[category.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getResponseTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '💬';
      case 'photo': return '📸';
      case 'action': return '⚡';
      default: return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] bg-background">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Task History</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] p-6">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : taskHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No completed tasks yet.</p>
                <p className="text-sm mt-2">Start playing to build your history!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {taskHistory.map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(task.card_category)}>
                            {task.card_category}
                          </Badge>
                          <span className="text-lg">
                            {getResponseTypeIcon(task.response_type)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            by {task.user_name}
                          </span>
                        </div>
                        
                        <p className="font-medium text-sm mb-3 text-muted-foreground">
                          {task.card_prompt}
                        </p>

                        {task.response_type === 'text' && task.response_text && !task.response_text.startsWith('https://') && (
                          <div className="bg-muted/50 p-3 rounded-md mb-2">
                            <p className="text-sm whitespace-pre-wrap">{task.response_text}</p>
                          </div>
                        )}

                        {task.response_type === 'photo' && (task.response_photo_url || (task.response_text && task.response_text.startsWith('https://'))) && (
                          <div className="mb-2">
                            <img
                              src={task.response_photo_url || task.response_text || ''}
                              alt="Photo response"
                              className="max-h-64 max-w-full rounded-md border object-cover"
                              onError={(e) => {
                                console.error('Failed to load image:', task.response_photo_url || task.response_text);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Show photo even if response_type is text but contains image URL */}
                        {task.response_type === 'text' && task.response_text && task.response_text.startsWith('https://') && (
                          <div className="mb-2">
                            <img
                              src={task.response_text}
                              alt="Photo response"
                              className="max-h-64 max-w-full rounded-md border object-cover"
                              onError={(e) => {
                                console.error('Failed to load image:', task.response_text);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {task.response_type === 'action' && (
                          <div className="flex items-center gap-2 text-green-600 mb-2">
                            <span className="text-lg">✅</span>
                            <span className="text-sm font-medium">Action completed</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{format(new Date(task.responded_at), 'MMM d, h:mm a')}</p>
                        {task.time_taken_seconds && (
                          <p className="mt-1">
                            ⏱️ {Math.floor(task.time_taken_seconds / 60)}m {task.time_taken_seconds % 60}s
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};