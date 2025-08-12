import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { X, Flame, Calendar, Star, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
interface DailyCheckinFlowProps {
  userId: string;
  coupleId: string;
  onComplete: () => void;
  onClose: () => void;
  currentStreak?: number;
}
type MoodType = Database['public']['Enums']['mood_type'];

// Simplified 2-step Daily Check-in focused on relationship goals
const connectionLevels = [{
  value: 'deeply_connected',
  label: 'Deeply Connected',
  emoji: '💕',
  description: 'Felt very close and bonded today'
}, {
  value: 'connected',
  label: 'Connected',
  emoji: '❤️',
  description: 'Good connection and understanding'
}, {
  value: 'neutral',
  label: 'Neutral',
  emoji: '😌',
  description: 'Things were steady and normal'
}, {
  value: 'somewhat_distant',
  label: 'Somewhat Distant',
  emoji: '😐',
  description: 'Felt a bit disconnected'
}, {
  value: 'distant',
  label: 'Distant',
  emoji: '😔',
  description: 'Struggled to connect today'
}];
const relationshipPrompts = ["Plan quality time together", "Have a meaningful conversation", "Express appreciation", "Be more physically affectionate", "Work on a shared goal", "Surprise them with something small", "Listen more actively", "Share something vulnerable"];
export const DailyCheckinFlow: React.FC<DailyCheckinFlowProps> = ({
  userId,
  coupleId,
  onComplete,
  onClose,
  currentStreak = 0
}) => {
  const [step, setStep] = useState(1);
  const [connectionLevel, setConnectionLevel] = useState<string | null>(null);
  const [tomorrowIntention, setTomorrowIntention] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAlreadyCheckedIn, setHasAlreadyCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {
    toast
  } = useToast();
  const totalSteps = 2;
  const progress = step / totalSteps * 100;

  // Check for existing check-in on component mount
  useEffect(() => {
    const checkExistingCheckin = async () => {
      if (!coupleId || !userId) {
        setIsLoading(false);
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      
      // Check if a COMPLETE daily checkin exists (not just mood)
      // A complete checkin should have relationship_feeling and gratitude fields filled
      const { data: existingCheckin } = await supabase
        .from('daily_checkins')
        .select('id, relationship_feeling, gratitude')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .eq('checkin_date', today)
        .maybeSingle();
      
      // Only consider it "already checked in" if it has the daily checkin fields completed
      if (existingCheckin && existingCheckin.relationship_feeling && existingCheckin.gratitude) {
        setHasAlreadyCheckedIn(true);
      }
      setIsLoading(false);
    };
    checkExistingCheckin();
  }, [coupleId, userId]);
  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  const handleComplete = async () => {
    if (!coupleId || !connectionLevel || !tomorrowIntention.trim()) {
      toast({
        title: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if checkin already exists for today and get existing mood
      const {
        data: existingCheckin
      } = await supabase.from('daily_checkins').select('id, mood').eq('user_id', userId).eq('couple_id', coupleId).eq('checkin_date', today).maybeSingle();
      
      const checkinData = {
        // Only set mood if the user doesn't already have one, otherwise preserve existing mood
        mood: existingCheckin?.mood || 'content' as MoodType,
        energy_level: null,
        // Not used in simplified version
        relationship_feeling: connectionLevel,
        gratitude: tomorrowIntention,
        // Store tomorrow's intention in gratitude field
        notes: null
      };
      
      if (existingCheckin) {
        // For updates, only update the daily checkin fields, preserve existing mood
        await supabase.from('daily_checkins').update({
          relationship_feeling: connectionLevel,
          gratitude: tomorrowIntention,
          notes: null
        }).eq('id', existingCheckin.id);
      } else {
        await supabase.from('daily_checkins').insert({
          user_id: userId,
          couple_id: coupleId,
          checkin_date: today,
          ...checkinData
        });
        // Push notify partner about completed check-in
        try {
          const { data: couple } = await supabase
            .from('couples')
            .select('user1_id, user2_id')
            .eq('id', coupleId)
            .single();
          const partnerId = couple ? (couple.user1_id === userId ? couple.user2_id : couple.user1_id) : null;
          if (partnerId) {
            await supabase.functions.invoke('send-push', {
              body: {
                target_user_id: partnerId,
                title: 'Daily check-in complete',
                body: 'Your partner just completed their daily check-in',
                data: { route: '/dashboard' }
              }
            });
          }
        } catch (e) {
          console.warn('send-push checkin failed (non-blocking):', e);
        }
      }

      // Log activity for enhanced sync score
      if (!existingCheckin) {
        await supabase.rpc('log_couple_activity', {
          p_couple_id: coupleId,
          p_user_id: userId,
          p_activity_type: 'checkin',
          p_activity_data: {
            connection_level: connectionLevel,
            tomorrow_intention: tomorrowIntention.trim()
          },
          p_points_awarded: 4 // Base points for individual checkin
        });
      }

      // Calculate proper streak by checking both partners
      let newStreak = currentStreak;
      let bothCheckedIn = false;
      if (!existingCheckin) {
        // Get couple data to find partner ID
        const {
          data: coupleData
        } = await supabase.from('couples').select('user1_id, user2_id').eq('id', coupleId).single();
        if (coupleData) {
          const partnerId = coupleData.user1_id === userId ? coupleData.user2_id : coupleData.user1_id;

          // Check if partner has also checked in today
          const {
            data: partnerCheckin
          } = await supabase.from('daily_checkins').select('id').eq('user_id', partnerId).eq('couple_id', coupleId).eq('checkin_date', today).maybeSingle();

          // If both partners have checked in today, increment streak
          if (partnerCheckin) {
            bothCheckedIn = true;
            newStreak = currentStreak + 1;

            // Log additional points for both partners checking in
            await supabase.rpc('log_couple_activity', {
              p_couple_id: coupleId,
              p_user_id: userId,
              p_activity_type: 'checkin',
              p_activity_data: {
                type: 'both_partners_checkin',
                streak: newStreak
              },
              p_points_awarded: 4 // Additional points for both partners
            });
          }
        }
      }

      // Show celebration toast based on completion and streak milestones
      let celebrationMessage = "Daily check-in completed! 💕";
      if (!existingCheckin) {
        if (bothCheckedIn) {
          celebrationMessage = "Amazing! You both checked in today! 🔥";
        } else {
          celebrationMessage = "Check-in saved! Invite your partner to check in too! 🌟";
        }
      }
      if (newStreak > currentStreak) {
        if (newStreak === 1) {
          celebrationMessage = "Great start! You both checked in today! 🔥";
        } else if (newStreak === 7) {
          celebrationMessage = "Amazing! 7-day couple streak! You're on fire! 🔥🔥";
        } else if (newStreak === 30) {
          celebrationMessage = "Incredible! 30-day couple streak! You're champions! 🏆";
        } else {
          celebrationMessage = `Fantastic! ${newStreak}-day couple streak! Keep it up! 🔥`;
        }
      }
      toast({
        title: celebrationMessage,
        description: "Your partner will see your check-in"
      });

      // Signal dashboard to refresh
      localStorage.setItem('checkin_updated', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      onComplete();
    } catch (error) {
      console.error('Error completing check-in:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const canProceed = () => {
    switch (step) {
      case 1:
        return connectionLevel !== null;
      case 2:
        return tomorrowIntention.trim().length > 0;
      default:
        return false;
    }
  };
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-base font-semibold text-foreground mb-2">How connected did you feel with your partner today?</h3>
              <p className="text-xs text-muted-foreground">Your emotional connection is the heart of your relationship</p>
            </div>
            
            <div className="space-y-2">
              {connectionLevels.map(level => <Button key={level.value} variant={connectionLevel === level.value ? "default" : "outline"} className={`w-full flex items-center justify-start p-2 h-auto text-left ${connectionLevel === level.value ? 'bg-secondary text-white border-secondary' : 'hover:bg-muted'}`} onClick={() => setConnectionLevel(level.value)}>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{level.emoji}</span>
                    <div className="text-left flex-1">
                      <div className="font-medium text-sm">{level.label}</div>
                      <div className="text-xs opacity-70">{level.description}</div>
                    </div>
                  </div>
                </Button>)}
            </div>
          </div>;
      case 2:
        return <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-base font-semibold text-foreground mb-2">What's one thing you want to do to strengthen your relationship tomorrow?</h3>
              <p className="text-xs text-muted-foreground">Set an intention for building a stronger connection</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="intention" className="text-xs font-medium">
                  Tomorrow's relationship intention *
                </Label>
                <Textarea id="intention" placeholder="I want to..." value={tomorrowIntention} onChange={e => setTomorrowIntention(e.target.value)} className="mt-1 min-h-[60px] text-sm" />
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Need inspiration? Try one of these:</p>
                <div className="flex flex-wrap gap-1">
                   {relationshipPrompts.map((prompt, index) => <Button key={index} variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setTomorrowIntention(prompt)}>
                      {prompt}
                    </Button>)}
                </div>
              </div>
            </div>
          </div>;
      default:
        return null;
    }
  };
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-[100] overflow-hidden">
      <div className="w-full max-w-sm h-[85vh] flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full">
            {/* Header with streak display - Fixed */}
            <div className="bg-gradient-romance p-2 text-white flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <Flame className="text-white" size={16} />
                  <h2 className="text-sm font-bold">Daily Check-in</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 h-7 w-7 p-0">
                  <X size={14} />
                </Button>
              </div>
              
              {/* Streak Display */}
              <div className="bg-white/20 rounded-lg p-1.5">
                <div className="flex items-center justify-center space-x-2">
                  <Flame className="text-white" size={16} />
                  <div className="text-center">
                    <div className="text-base font-bold">{currentStreak}</div>
                    <div className="text-xs opacity-90">Day Streak</div>
                  </div>
                </div>
                {currentStreak > 0 && <div className="text-center mt-0.5">
                    <p className="text-xs opacity-80">
                      {currentStreak >= 7 ? "You're on fire! 🔥" : "Keep the momentum going! 💪"}
                    </p>
                  </div>}
              </div>
            </div>

            {/* Content - Scrollable Area */}
            <div className="flex-1 overflow-y-auto bg-background min-h-0">
              <div className="p-3">
                {/* Show warning if already checked in today */}
                {hasAlreadyCheckedIn ? <div className="text-center space-y-3">
                    <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <div className="text-2xl">✅</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground">You're Already Checked In Today!</h3>
                      <p className="text-xs text-muted-foreground">
                        You've completed your daily check-in for today. Come back tomorrow to continue your streak!
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                      <p className="text-xs text-green-700 font-medium">
                        ⏰ Return back tomorrow to check in again
                      </p>
                    </div>
                    <div className="pt-1">
                      <Button onClick={onClose} className="w-full bg-secondary hover:bg-secondary/90 h-9">
                        Got it!
                      </Button>
                    </div>
                  </div> : isLoading ? <div className="text-center py-6">
                    <div className="text-muted-foreground text-sm">Loading...</div>
                  </div> : renderStepContent()}
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            {!hasAlreadyCheckedIn && !isLoading && <div className="flex-shrink-0 border-t bg-background">
                <div className="p-3">
                  <div className="flex space-x-2">
                    {step > 1 && <Button variant="outline" onClick={handlePrevious} className="flex-1 h-9 text-sm">
                        Previous
                      </Button>}
                    
                    {step < totalSteps ? <Button onClick={handleNext} disabled={!canProceed()} className="flex-1 bg-secondary hover:bg-secondary/90 h-9 text-sm">
                        Next Step
                      </Button> : <Button onClick={handleComplete} disabled={!canProceed() || isSubmitting} className="flex-1 bg-secondary hover:bg-secondary/90 h-9 text-sm">
                        {isSubmitting ? 'Saving...' : 'Complete Check-in'}
                      </Button>}
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
};