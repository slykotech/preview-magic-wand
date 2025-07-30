import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoodBitmoji } from './MoodBitmoji';
import { Heart, Plus, Edit3 } from 'lucide-react';
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
  const [showMoodSelector, setShowMoodSelector] = useState(false);
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
      setShowMoodSelector(false);
      
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
            {userMood && !showMoodSelector ? (
              <div className="relative group">
                <MoodBitmoji mood={userMood} size="lg" />
                <button
                  onClick={() => setShowMoodSelector(true)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full shadow-sm border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isSubmitting}
                >
                  <Edit3 size={12} className="text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-muted-foreground/30">
                  <Plus className="text-muted-foreground" size={24} />
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 animate-scale-in">
                  <p className="text-xs text-muted-foreground mb-3 text-center font-medium">
                    {userMood ? 'Update Mood' : 'Quick Check-in'}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {quickMoods.slice(0, 3).map((mood) => (
                      <button
                        key={mood.value}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-white/80 hover:from-primary/10 hover:to-primary/5 hover:scale-110 hover:animate-bounce transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 border border-white/50"
                        onClick={() => handleQuickMoodSelect(mood.value)}
                        disabled={isSubmitting}
                      >
                        <span className="text-lg">{mood.emoji}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {quickMoods.slice(3).map((mood) => (
                      <button
                        key={mood.value}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-white/80 hover:from-primary/10 hover:to-primary/5 hover:scale-110 hover:animate-bounce transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 border border-white/50"
                        onClick={() => handleQuickMoodSelect(mood.value)}
                        disabled={isSubmitting}
                      >
                        <span className="text-lg">{mood.emoji}</span>
                      </button>
                    ))}
                  </div>
                  {userMood && (
                    <button
                      onClick={() => setShowMoodSelector(false)}
                      className="text-xs text-muted-foreground hover:text-foreground underline mt-3 block mx-auto transition-colors"
                    >
                      Cancel
                    </button>
                  )}
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
        
        {!userMood && !partnerMood && !showMoodSelector && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Tap an emoji above to share your mood!
          </p>
        )}
      </CardContent>
    </Card>
  );
};