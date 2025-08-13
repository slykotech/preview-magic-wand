import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LoveStoryLogo } from "@/components/LoveSyncLogo";
import { Heart, Sparkles, Calendar, Camera, Gamepad2, Clock, Zap, MessageCircle, Archive } from "lucide-react";
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/dashboard', {
        replace: true
      });
    } else if (localStorage.getItem('onboarding_completed') === 'true') {
      navigate('/auth', {
        replace: true
      });
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="min-h-screen bg-gradient-romance flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart size={40} className="text-white" />
          </div>
          <p className="text-white font-inter font-bold">Loading Love Story...</p>
        </div>
      </div>;
  }
  return <div className="min-h-[80vh] bg-gradient-romance flex flex-col items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-3">
            <LoveStoryLogo size="lg" />
            <div className="text-left">
              <p className="text-lg text-white/90 font-inter font-medium">Introducing</p>
              <h1 className="text-3xl font-bold">Love Story</h1>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">
              Your Relationship Co-Pilot
            </h2>
            <p className="text-base text-white/90 leading-relaxed">Strengthen emotional bonds, plan meaningful moments, and grow together one day at a time.</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Quality Time</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Soul Syncing</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Plan Dates Together</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <MessageCircle className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Connection Check-In</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Gamepad2 className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Fun Couple Games</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Archive className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Memory Vault</h3>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button onClick={() => navigate('/motto')} variant="secondary" size="lg" className="w-full text-lg font-bold">
            Get Started
          </Button>
          <Button onClick={() => navigate('/auth')} variant="outline" size="lg" className="w-full text-white border-white/60 bg-white/5 hover:bg-white/15 hover:text-white hover:border-white/80 transition-all duration-200">
            Already have an account? Sign In
          </Button>
        </div>
      </div>
    </div>;
};
export default Index;