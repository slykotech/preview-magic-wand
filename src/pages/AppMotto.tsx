import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Sparkles, Shield, Users, ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppMottoProps {
  onNext: () => void;
  onBack: () => void;
}

const AppMottoPage = ({ onNext, onBack }: AppMottoProps) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Heart size={48} className="text-accent" />,
      title: "Love, Amplified",
      subtitle: "Where technology meets the heart",
      description: "LoveSync uses AI to understand your unique relationship dynamics and help you create deeper, more meaningful connections.",
      feature: "AI-powered relationship insights"
    },
    {
      icon: <Sparkles size={48} className="text-accent" />,
      title: "Every Moment Matters",
      subtitle: "Turn ordinary days into extraordinary memories",
      description: "From spontaneous date ideas to thoughtful check-ins, we help you discover magic in everyday moments together.",
      feature: "Smart date planning & memory tracking"
    },
    {
      icon: <Users size={48} className="text-accent" />,
      title: "Grow Together",
      subtitle: "Your personal relationship coach",
      description: "Navigate challenges, celebrate wins, and build communication skills with gentle guidance tailored to your relationship.",
      feature: "24/7 relationship coaching"
    },
    {
      icon: <Shield size={48} className="text-accent" />,
      title: "Private & Secure",
      subtitle: "Your love story stays yours",
      description: "End-to-end encryption ensures your most intimate conversations and memories remain completely private between you and your partner.",
      feature: "Bank-level security"
    }
  ];

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 relative overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-400 to-purple-600 opacity-10 rounded-full blur-3xl transform translate-x-48 -translate-y-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-400 to-pink-600 opacity-15 rounded-full blur-3xl transform -translate-x-48 translate-y-48"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-6 pt-12 pb-2">
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/onboarding')}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Skip
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 flex flex-col justify-center">
          <div className="max-w-lg mx-auto text-center space-y-8">
            {/* Icon */}
            <div className="animate-bounce-subtle flex justify-center">
              {currentSlideData.icon}
            </div>

            {/* Text Content */}
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-3xl font-display font-bold text-purple-900 dark:text-purple-100">
                {currentSlideData.title}
              </h1>
              <h2 className="text-xl text-accent font-medium">
                {currentSlideData.subtitle}
              </h2>
              <p className="text-purple-700 dark:text-purple-300 leading-relaxed font-text">
                {currentSlideData.description}
              </p>
            </div>

            {/* Feature Highlight */}
            <Card className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-center gap-2">
                <Star size={16} className="text-accent" />
                <span className="text-sm font-medium text-accent font-text">
                  {currentSlideData.feature}
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-12">
          <div className="max-w-lg mx-auto space-y-6">
            {/* Slide Indicators */}
            <div className="flex justify-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-accent w-8' 
                      : 'bg-purple-300 dark:bg-purple-600'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-8">
              {isLastSlide ? (
                <Button 
                  onClick={() => navigate('/onboarding')}
                  className="w-full py-4 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  Start Your Journey
                  <Heart size={20} className="ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={() => setCurrentSlide(currentSlide + 1)}
                  className="w-full py-4 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  Next
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              )}

              {currentSlide > 0 && (
                <Button 
                  variant="ghost"
                  onClick={() => setCurrentSlide(currentSlide - 1)}
                  className="w-full text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Previous
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppMottoPage;