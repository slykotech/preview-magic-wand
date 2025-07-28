import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LoveSyncLogo } from "@/components/LoveSyncLogo";
import { Heart, Sparkles } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-romance flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart size={40} className="text-white" />
          </div>
          <p className="text-white font-inter font-bold">Loading Love Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-romance flex flex-col items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-4">
          <LoveSyncLogo size="lg" />
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold font-poppins">
              Love Sync
            </h1>
            <p className="text-xl text-white/90 font-inter font-bold">
              Where hearts connect and love grows
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
            <Sparkles className="text-gold-accent" size={24} />
            <div>
              <h3 className="font-poppins font-bold">AI Relationship Coach</h3>
              <p className="text-sm text-white/80 font-inter font-semibold">Get personalized advice for your relationship</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
            <Heart className="text-sunrise-coral" size={24} />
            <div>
              <h3 className="font-poppins font-bold">Sync Score</h3>
              <p className="text-sm text-white/80 font-inter font-semibold">Track your relationship harmony daily</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/auth')}
            variant="secondary"
            size="lg"
            className="w-full text-lg font-bold"
          >
            Get Started
          </Button>
          <p className="text-sm text-white/70 font-inter font-semibold">
            Already have an account? Sign in to continue your love journey
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;