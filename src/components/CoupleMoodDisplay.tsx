import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoodBitmoji } from './MoodBitmoji';
import { Heart, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface CoupleMoodDisplayProps {
  userMood?: string;
  partnerMood?: string;
  className?: string;
  userId?: string;
  coupleId?: string;
  onMoodUpdate?: () => void;
}

type MoodType = Database['public']['Enums']['mood_type'];

const quickMoods = [
  { value: 'happy' as MoodType, emoji: '😊' },
  { value: 'excited' as MoodType, emoji: '🤗' },
  { value: 'love' as MoodType, emoji: '😍' },
  { value: 'content' as MoodType, emoji: '😌' },
  { value: 'stressed' as MoodType, emoji: '😰' },
  { value: 'sad' as MoodType, emoji: '😢' },
];

export const CoupleMoodDisplay: React.FC<CoupleMoodDisplayProps> = ({ 
  userMood, 
  partnerMood, 
  className = '',
  userId,
  coupleId,
  onMoodUpdate
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQuickMoodSelect = async (mood: MoodType) => {
    if (!userId || !coupleId) {
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

      onMoodUpdate?.();
      
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
    <Card className={`${className} bg-gradient-to-br from-soft-cloud to-background border border-border/50 shadow-sm`}>
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-foreground">Today's Mood</h3>
          <p className="text-sm text-muted-foreground">How you're both feeling</p>
        </div>
        
        <div className="flex items-center justify-around">
          {/* User Mood */}
          <div className="flex-1 text-center">
            {userMood ? (
              <MoodBitmoji mood={userMood} size="lg" />
            ) : (
              <div className="space-y-3">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-muted-foreground/30">
                  <Plus className="text-muted-foreground" size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quick Check-in</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {quickMoods.slice(0, 3).map((mood) => (
                      <button
                        key={mood.value}
                        className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 hover:scale-105 transition-all duration-200 flex items-center justify-center shadow-sm disabled:opacity-50"
                        onClick={() => handleQuickMoodSelect(mood.value)}
                        disabled={isSubmitting}
                      >
                        <span className="text-sm">{mood.emoji}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {quickMoods.slice(3).map((mood) => (
                      <button
                        key={mood.value}
                        className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 hover:scale-105 transition-all duration-200 flex items-center justify-center shadow-sm disabled:opacity-50"
                        onClick={() => handleQuickMoodSelect(mood.value)}
                        disabled={isSubmitting}
                      >
                        <span className="text-sm">{mood.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Connection Heart */}
          <div className="flex-none px-4">
            <div className="bg-gradient-romance p-3 rounded-full">
              <Heart className="text-white" size={20} fill="white" />
            </div>
          </div>
          
          {/* Partner Mood */}
          <div className="flex-1 text-center">
            {partnerMood ? (
              <MoodBitmoji mood={partnerMood} size="lg" isPartner />
            ) : (
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl text-muted-foreground">?</span>
              </div>
            )}
          </div>
        </div>
        
        {!userMood && !partnerMood && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Tap an emoji above to share your mood!
          </p>
        )}
      </CardContent>
    </Card>
  );
};