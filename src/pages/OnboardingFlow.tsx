import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Users, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [relationshipType, setRelationshipType] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (localStorage.getItem('onboarding_completed') === 'true') {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);
  const relationshipTypes = [
    { id: "dating", label: "Dating", icon: <Heart size={24} /> },
    { id: "engaged", label: "Engaged", icon: <Heart size={24} /> },
    { id: "married", label: "Married", icon: <Heart size={24} /> },
    { id: "long-distance", label: "Long Distance", icon: <Heart size={24} /> }
  ];

  const goalOptions = [
    { id: "quality-time", label: "Improve Quality Time" },
    { id: "communication", label: "Better Communication" },
    { id: "intimacy", label: "Enhance Intimacy" },
    { id: "conflict-resolution", label: "Resolve Conflicts" },
    { id: "date-planning", label: "Plan Better Dates" },
    { id: "emotional-connection", label: "Deepen Emotional Connection" }
  ];

  const handleGoalToggle = (goalId: string) => {
    setGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Users size={48} className="mx-auto text-accent" />
              <h1 className="text-3xl font-bold text-foreground">Choose Your Relationship</h1>
              <p className="text-muted-foreground">Help us understand your relationship better</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {relationshipTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    relationshipType === type.id 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border'
                  }`}
                  onClick={() => setRelationshipType(type.id)}
                >
                  <div className="text-center space-y-2">
                    <div className="text-accent">{type.icon}</div>
                    <p className="font-medium">{type.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Target size={48} className="mx-auto text-accent" />
              <h1 className="text-3xl font-bold text-foreground">Set Your Goals</h1>
              <p className="text-muted-foreground">What would you like to improve in your relationship?</p>
            </div>
            
            <div className="space-y-3">
              {goalOptions.map((goal) => (
                <Card 
                  key={goal.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    goals.includes(goal.id) 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border'
                  }`}
                  onClick={() => handleGoalToggle(goal.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      goals.includes(goal.id) 
                        ? 'bg-accent border-accent' 
                        : 'border-muted-foreground'
                    }`} />
                    <p className="font-medium">{goal.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep < 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding and go to auth/sign-in
      console.log("Onboarding complete:", { relationshipType, goals });
      try { localStorage.setItem('onboarding_completed', 'true'); } catch {}
      navigate('/auth');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return relationshipType !== "";
      case 1:
        return goals.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep + 1} of 2</span>
            <span className="text-sm text-muted-foreground">{Math.round(((currentStep + 1) / 2) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-accent rounded-full h-2 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {renderStep()}

        {/* Navigation buttons */}
        <div className="mt-8 space-y-3">
          <Button 
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full"
          >
            {currentStep === 1 ? 'Complete Setup' : 'Continue'}
          </Button>
          
          {currentStep > 0 && (
            <Button 
              variant="ghost"
              onClick={handleBack}
              className="w-full"
            >
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;