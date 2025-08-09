import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LoveSyncLogo } from "@/components/LoveSyncLogo";
import { Heart, Sparkles, Calendar, Camera } from "lucide-react";
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
          <p className="text-white font-inter font-bold">Loading Love Sync...</p>
        </div>
      </div>;
  }
  return <div className="min-h-[80vh] bg-gradient-romance flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <LoveSyncLogo size="lg" />
            <div className="text-left">
              <p className="text-lg text-white/90 font-inter font-medium">Introducing</p>
              <h1 className="text-3xl font-extrabold font-poppins">Love Sync</h1>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold font-poppins text-white">
              Your Relationship Co-Pilot
            </h2>
            <p className="text-sm text-white/90 font-inter leading-relaxed">Strengthen emotional bonds, plan meaningful moments, and grow together one day at a time.</p>
          </div>
        </div>

        {/* Date Planner Introduction */}
        <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
              <Calendar className="text-white" size={16} />
            </div>
            <h3 className="font-poppins font-bold text-white text-lg">Smart Date Planner</h3>
          </div>
          <p className="text-white/90 text-sm font-inter text-left leading-relaxed">
            Discover personalized date ideas, plan romantic moments, and create lasting memories together with our AI-powered suggestions.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-3 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <div className="w-12 h-12">
              <img src="/lovable-uploads/e96cb636-6076-4256-8622-93e09fe2fd42.png" alt="Quality Time" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-semibold text-white text-sm">Quality Time</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white" size={16} />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-semibold text-white text-sm">Soul Syncing</h3>
            </div>
            <div className="w-12 h-12">
              <img src="/lovable-uploads/ea943bb4-0f80-4b60-8dab-9824039f4bc1.png" alt="Soul Syncing Avatar" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <div className="w-12 h-12">
              <img src="/lovable-uploads/d445b99d-8fa2-4613-9412-94521632578d.png" alt="Connection Check-In Avatar" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-semibold text-white text-sm">Connection Check-In</h3>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button onClick={() => navigate('/motto')} variant="secondary" size="lg" className="w-full text-lg font-bold">
            Get Started
          </Button>
          <Button onClick={() => navigate('/auth')} variant="ghost" size="lg" className="w-full text-white/80 hover:text-white">
            Already have an account? Sign In
          </Button>
        </div>
      </div>
    </div>;
};
export default Index;