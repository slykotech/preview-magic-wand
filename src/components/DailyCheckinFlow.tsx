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

const emotionalStates = [
  { value: 'excited' as MoodType, label: 'Amazing', emoji: '🤩', color: 'text-yellow-500' },
  { value: 'happy' as MoodType, label: 'Good', emoji: '😊', color: 'text-green-500' },
  { value: 'content' as MoodType, label: 'Okay', emoji: '😐', color: 'text-blue-500' },
  { value: 'anxious' as MoodType, label: 'Struggling', emoji: '😰', color: 'text-orange-500' },
  { value: 'sad' as MoodType, label: 'Difficult', emoji: '😢', color: 'text-red-500' },
];

const energyLevels = [1, 2, 3, 4, 5];

const relationshipFeelings = [
  { value: 'connected', label: 'Connected', icon: Heart, description: 'Feeling close and bonded' },
  { value: 'excited', label: 'Excited', icon: Star, description: 'Thrilled about your relationship' },
  { value: 'neutral', label: 'Neutral', icon: Calendar, description: 'Things are steady' },
  { value: 'distant', label: 'Distant', icon: Calendar, description: 'Feeling disconnected' },
  { value: 'concerned', label: 'Concerned', icon: Calendar, description: 'Worried about something' },
];

export const DailyCheckinFlow: React.FC<DailyCheckinFlowProps> = ({
  userId,
  coupleId,
  onComplete,
  onClose,
  currentStreak = 0
}) => {
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [relationshipFeeling, setRelationshipFeeling] = useState<string | null>(null);
  const [gratitude, setGratitude] = useState('');
  const [additionalThoughts, setAdditionalThoughts] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

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
    if (!coupleId || !selectedMood) {
      toast({
        title: "Please complete all required fields",
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

      const checkinData = {
        mood: selectedMood,
        energy_level: energyLevel,
        relationship_feeling: relationshipFeeling,
        gratitude: gratitude,
        notes: additionalThoughts || null,
      };

      if (existingCheckin) {
        await supabase
          .from('daily_checkins')
          .update(checkinData)
          .eq('id', existingCheckin.id);
      } else {
        await supabase
          .from('daily_checkins')
          .insert({
            user_id: userId,
            couple_id: coupleId,
            checkin_date: today,
            ...checkinData
          });
      }

      // Calculate new streak for celebration
      const newStreak = currentStreak + (existingCheckin ? 0 : 1);
      
      // Show celebration toast based on streak milestones
      let celebrationMessage = "Daily check-in completed! 💕";
      if (newStreak === 1 && !existingCheckin) {
        celebrationMessage = "Great start! You've begun your streak! 🔥";
      } else if (newStreak === 7 && !existingCheckin) {
        celebrationMessage = "Amazing! 7-day streak! You're on fire! 🔥🔥";
      } else if (newStreak === 30 && !existingCheckin) {
        celebrationMessage = "Incredible! 30-day streak! You're a champion! 🏆";
      } else if (newStreak > 0 && !existingCheckin) {
        celebrationMessage = `Fantastic! ${newStreak}-day streak! Keep it up! 🔥`;
      }

      toast({
        title: celebrationMessage,
        description: "Your partner will see your check-in",
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
      case 1: return selectedMood !== null;
      case 2: return energyLevel !== null;
      case 3: return relationshipFeeling !== null;
      case 4: return gratitude.trim().length > 0;
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">How are you feeling today?</h3>
              <p className="text-sm text-muted-foreground">Your daily emotional check-in</p>
            </div>
            <div className="space-y-3">
              {emotionalStates.map((state) => (
                <Button
                  key={state.value}
                  variant={selectedMood === state.value ? "default" : "outline"}
                  className={`w-full flex items-center justify-between p-4 h-auto ${
                    selectedMood === state.value 
                      ? 'bg-secondary text-white border-secondary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedMood(state.value)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{state.emoji}</span>
                    <span className="font-medium">{state.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Tap to select</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">What's your energy level?</h3>
              <p className="text-sm text-muted-foreground">How energized do you feel right now?</p>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground flex items-center">
                😴 Low Energy
              </span>
              <span className="text-sm text-muted-foreground flex items-center">
                ⚡ High Energy
              </span>
            </div>
            <div className="flex justify-center space-x-4">
              {energyLevels.map((level) => (
                <Button
                  key={level}
                  variant={energyLevel === level ? "default" : "outline"}
                  className={`w-12 h-12 rounded-full ${
                    energyLevel === level 
                      ? 'bg-secondary text-white border-secondary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setEnergyLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
            {energyLevel && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Selected: {energyLevel}/5
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                How do you feel about your relationship today?
              </h3>
              <p className="text-sm text-muted-foreground">Your connection with your partner</p>
            </div>
            <div className="space-y-3">
              {relationshipFeelings.map((feeling) => {
                const Icon = feeling.icon;
                return (
                  <Button
                    key={feeling.value}
                    variant={relationshipFeeling === feeling.value ? "default" : "outline"}
                    className={`w-full flex items-center justify-start p-4 h-auto ${
                      relationshipFeeling === feeling.value 
                        ? 'bg-secondary text-white border-secondary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setRelationshipFeeling(feeling.value)}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={20} />
                      <div className="text-left">
                        <div className="font-medium">{feeling.label}</div>
                        <div className="text-xs opacity-70">{feeling.description}</div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                What are you grateful for today?
              </h3>
              <p className="text-sm text-muted-foreground">Express your appreciation and thoughts</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="gratitude" className="text-sm font-medium">
                  Gratitude *
                </Label>
                <Textarea
                  id="gratitude"
                  placeholder="I'm grateful for..."
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="thoughts" className="text-sm font-medium">
                  Additional thoughts (Optional)
                </Label>
                <Textarea
                  id="thoughts"
                  placeholder="Anything else on your mind..."
                  value={additionalThoughts}
                  onChange={(e) => setAdditionalThoughts(e.target.value)}
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Header with streak display */}
          <div className="bg-gradient-romance p-6 text-white flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Flame className="text-white" size={24} />
                <h2 className="text-lg font-bold">Daily Check-in</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X size={20} />
              </Button>
            </div>
            
            {/* Streak Display */}
            <div className="bg-white/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-3">
                <Flame className="text-white" size={32} />
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentStreak}</div>
                  <div className="text-sm opacity-90">Day Streak</div>
                </div>
              </div>
              {currentStreak > 0 && (
                <div className="text-center mt-2">
                  <p className="text-xs opacity-80">
                    {currentStreak >= 7 ? "You're on fire! 🔥" : "Keep the momentum going! 💪"}
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="bg-white/20" />
              <div className="text-center text-sm opacity-90">
                Step {step} of {totalSteps}
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderStepContent()}
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="p-6 pt-0 flex-shrink-0 border-t bg-background">
            <div className="flex space-x-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1"
                >
                  Previous
                </Button>
              )}
              
              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 bg-secondary hover:bg-secondary/90"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed() || isSubmitting}
                  className="flex-1 bg-secondary hover:bg-secondary/90"
                >
                  {isSubmitting ? 'Saving...' : 'Complete Check-in'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};