import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface MoodCheckinProps {
  userId: string;
  coupleId: string;
  currentMood?: string;
  onMoodUpdate?: (mood: string) => void;
}

type MoodType = Database['public']['Enums']['mood_type'];

const moods = [
  { value: 'excited' as MoodType, label: 'Excited', emoji: '🤩', color: 'from-yellow-400 to-orange-400' },
  { value: 'happy' as MoodType, label: 'Happy', emoji: '😊', color: 'from-green-400 to-blue-400' },
  { value: 'content' as MoodType, label: 'Content', emoji: '😌', color: 'from-blue-400 to-purple-400' },
  { value: 'anxious' as MoodType, label: 'Anxious', emoji: '😰', color: 'from-orange-400 to-red-400' },
  { value: 'sad' as MoodType, label: 'Sad', emoji: '😢', color: 'from-gray-400 to-blue-400' },
  { value: 'stressed' as MoodType, label: 'Stressed', emoji: '😵', color: 'from-red-400 to-pink-400' },
];

export const MoodCheckin: React.FC<MoodCheckinProps> = ({ 
  userId, 
  coupleId, 
  currentMood, 
  onMoodUpdate 
}) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(currentMood || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleMoodSelect = async (mood: MoodType) => {
    if (!coupleId) {
      toast({
        title: "Setup Required",
        description: "Please complete your couple setup first",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if checkin already exists for today
      const { data: existingCheckin } = await supabase
        .from('daily_checkins')
        .select('id')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .eq('checkin_date', today)
        .maybeSingle();

      if (existingCheckin) {
        // Update existing checkin
        await supabase
          .from('daily_checkins')
          .update({ mood })
          .eq('id', existingCheckin.id);
      } else {
        // Create new checkin
        await supabase
          .from('daily_checkins')
          .insert({
            user_id: userId,
            couple_id: coupleId,
            checkin_date: today,
            mood
          });
      }

      setSelectedMood(mood);
      onMoodUpdate?.(mood);
      
      // Log activity for enhanced sync score
      if (!existingCheckin) {
        await supabase.rpc('log_couple_activity', {
          p_couple_id: coupleId,
          p_user_id: userId,
          p_activity_type: 'checkin',
          p_activity_data: {
            mood: mood,
            type: 'mood_checkin'
          },
          p_points_awarded: 2 // Points for mood check-in
        });
      }

      // Signal dashboard to refresh
      localStorage.setItem('mood_updated', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Mood Updated! 💕",
        description: `You're feeling ${mood} today`,
      });
    } catch (error) {
      console.error('Error updating mood:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-muted/30 border shadow-lg">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Quick Mood Check</h3>
          <p className="text-sm text-muted-foreground">Tap an emoji to share how you're feeling</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          {moods.map((mood) => {
            const isSelected = selectedMood === mood.value;
            
            return (
              <button
                key={mood.value}
                className={`
                  group relative flex flex-col items-center justify-center 
                  w-16 h-16 rounded-full transition-all duration-200 
                  ${isSelected 
                    ? `bg-gradient-to-br ${mood.color} shadow-lg scale-110 ring-2 ring-white` 
                    : 'bg-white/60 hover:bg-white/80 hover:scale-105 shadow-sm'
                  }
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => handleMoodSelect(mood.value)}
                disabled={isSubmitting}
              >
                <span className="text-2xl">{mood.emoji}</span>
                {isSelected && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                    {mood.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {selectedMood && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm">
              <span>✓</span>
              Mood shared with your partner!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};