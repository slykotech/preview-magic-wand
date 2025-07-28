import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Smile, Meh, Frown, Star, Coffee } from 'lucide-react';
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
  { value: 'excited' as MoodType, label: 'Excited', icon: Star, color: 'text-yellow-500' },
  { value: 'happy' as MoodType, label: 'Happy', icon: Smile, color: 'text-green-500' },
  { value: 'content' as MoodType, label: 'Content', icon: Meh, color: 'text-blue-500' },
  { value: 'anxious' as MoodType, label: 'Anxious', icon: Coffee, color: 'text-orange-500' },
  { value: 'sad' as MoodType, label: 'Sad', icon: Frown, color: 'text-red-500' },
  { value: 'stressed' as MoodType, label: 'Stressed', icon: Heart, color: 'text-pink-500' },
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
    <Card className="bg-card border shadow-sm">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">How are you feeling?</h3>
          <p className="text-sm text-muted-foreground">Share your mood today</p>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {moods.map((mood) => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.value;
            
            return (
              <Button
                key={mood.value}
                variant={isSelected ? "default" : "outline"}
                className={`flex flex-col gap-2 h-auto p-4 ${
                  isSelected 
                    ? 'bg-secondary text-white border-secondary' 
                    : 'hover:bg-muted'
                } transition-all`}
                onClick={() => handleMoodSelect(mood.value)}
                disabled={isSubmitting}
              >
                <Icon 
                  size={20} 
                  className={isSelected ? 'text-white' : mood.color} 
                />
                <span className="text-xs font-medium">{mood.label}</span>
              </Button>
            );
          })}
        </div>
        
        {selectedMood && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Thanks for sharing! Your partner will see your mood.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};