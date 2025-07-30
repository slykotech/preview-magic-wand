import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoodBitmoji } from './MoodBitmoji';
import { Heart, Plus, Edit3, X } from 'lucide-react';
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
  const [selectedEmojiAnimation, setSelectedEmojiAnimation] = useState<{ emoji: string; id: number } | null>(null);
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

    // Trigger floating animation
    const selectedMoodEmoji = quickMoods.find(m => m.value === mood)?.emoji || '';
    const animationId = Date.now();
    setSelectedEmojiAnimation({ emoji: selectedMoodEmoji, id: animationId });
    
    // Remove animation after it completes
    setTimeout(() => {
      setSelectedEmojiAnimation(null);
    }, 1000);

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
    <div className="relative">
      {/* Floating Animation Overlay */}
      {selectedEmojiAnimation && (
        <div 
          key={selectedEmojiAnimation.id}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div className="animate-[float-up_1s_ease-out_forwards] text-6xl">
            {selectedEmojiAnimation.emoji}
          </div>
        </div>
      )}
      
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
                <button
                  onClick={() => setShowMoodSelector(true)}
                  className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                >
                  <Plus className="text-muted-foreground" size={24} />
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  {userMood ? 'Update Mood' : 'Quick Check-in'}
                </p>
              </div>
            )}
          </div>
          
          {/* Mood Selection Modal */}
          <Dialog open={showMoodSelector} onOpenChange={setShowMoodSelector}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader className="text-center pb-4">
                <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="text-muted-foreground" size={20} />
                </div>
                <DialogTitle className="text-xl font-semibold text-primary">
                  {userMood ? 'Update Mood' : 'Update Mood'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-3 gap-4 py-6">
                {quickMoods.map((mood) => (
                  <button
                    key={mood.value}
                    className="flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-white to-muted/30 hover:from-primary/10 hover:to-primary/5 hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 border border-border/20 group"
                    onClick={() => handleQuickMoodSelect(mood.value)}
                    disabled={isSubmitting}
                  >
                    <span className="text-3xl mb-2 group-hover:animate-bounce">{mood.emoji}</span>
                    <span className="text-sm text-foreground font-medium capitalize">{mood.value}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowMoodSelector(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
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
    </div>
  );
};