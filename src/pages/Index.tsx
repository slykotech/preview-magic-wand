import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LoveSyncLogo } from "@/components/LoveSyncLogo";
import { Heart, Sparkles, Calendar, Camera } from "lucide-react";
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();

  // SEO
  useEffect(() => {
    document.title = "Love Sync – Relationship Co-Pilot";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Love Sync helps couples plan memorable dates, deepen connection, and track relationship health."
      );
    }
    const linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = window.location.href;
      document.head.appendChild(link);
    }
  }, []);

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
  return <div className="min-h-screen bg-gradient-romance flex flex-col items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-3">
            <LoveSyncLogo size="lg" />
            <div className="text-left">
              <p className="text-lg text-white/90 font-inter font-medium">Introducing</p>
              <h1 className="text-3xl font-extrabold font-poppins">Love Sync</h1>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold font-poppins text-white">
              Your Relationship Co-Pilot
            </h2>
            <p className="text-base text-white/90 font-inter leading-relaxed">Strengthen emotional bonds, plan meaningful moments, and grow together one day at a time.</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          {/* Date Planning - intro */}
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-bold text-white">Date Planning</h3>
              <p className="text-sm text-white/80">Plan memorable moments together with curated ideas.</p>
              <div className="mt-2 flex -space-x-2">
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/379d21da-b57c-42de-8fa4-bb2cb2c617d5.png" alt="Couple avatar 1 for date planning" loading="lazy" />
                  <AvatarFallback>💞</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/ea943bb4-0f80-4b60-8dab-9824039f4bc1.png" alt="Couple avatar 2 for date planning" loading="lazy" />
                  <AvatarFallback>💖</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/d445b99d-8fa2-4613-9412-94521632578d.png" alt="Couple avatar 3 for date planning" loading="lazy" />
                  <AvatarFallback>❤️</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="w-16 h-16">
              <img 
                src="/lovable-uploads/60e9a823-d70b-4be5-949d-e0f8315086ec.png" 
                alt="Date planning for couples" 
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>

          {/* Quality Time */}
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm relative">
            <div className="relative z-10 w-16 h-16 -mt-2 -mb-2">
              <img 
                src="/lovable-uploads/e96cb636-6076-4256-8622-93e09fe2fd42.png" 
                alt="Quality Time" 
                className="w-full h-full object-contain drop-shadow-lg"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-bold text-white">Quality Time</h3>
              <div className="mt-2 flex -space-x-2">
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/379d21da-b57c-42de-8fa4-bb2cb2c617d5.png" alt="Couple avatar 1 for quality time" loading="lazy" />
                  <AvatarFallback>QT</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/ea943bb4-0f80-4b60-8dab-9824039f4bc1.png" alt="Couple avatar 2 for quality time" loading="lazy" />
                  <AvatarFallback>💖</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/d445b99d-8fa2-4613-9412-94521632578d.png" alt="Couple avatar 3 for quality time" loading="lazy" />
                  <AvatarFallback>❤️</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* Soul Syncing */}
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-bold text-white">Soul Syncing</h3>
              <div className="mt-2 flex -space-x-2">
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/379d21da-b57c-42de-8fa4-bb2cb2c617d5.png" alt="Couple avatar 1 for soul syncing" loading="lazy" />
                  <AvatarFallback>SS</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/e96cb636-6076-4256-8622-93e09fe2fd42.png" alt="Couple avatar 2 for soul syncing" loading="lazy" />
                  <AvatarFallback>💞</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/d445b99d-8fa2-4613-9412-94521632578d.png" alt="Couple avatar 3 for soul syncing" loading="lazy" />
                  <AvatarFallback>✨</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="w-16 h-16">
              <img 
                src="/lovable-uploads/ea943bb4-0f80-4b60-8dab-9824039f4bc1.png" 
                alt="Soul Syncing Avatar" 
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>

          {/* Connection Check-In */}
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-16 h-16">
              <img 
                src="/lovable-uploads/d445b99d-8fa2-4613-9412-94521632578d.png" 
                alt="Connection Check-In Avatar" 
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-bold text-white">Connection Check-In</h3>
              <div className="mt-2 flex -space-x-2">
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/379d21da-b57c-42de-8fa4-bb2cb2c617d5.png" alt="Couple avatar 1 for check-in" loading="lazy" />
                  <AvatarFallback>CC</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/ea943bb4-0f80-4b60-8dab-9824039f4bc1.png" alt="Couple avatar 2 for check-in" loading="lazy" />
                  <AvatarFallback>💬</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/e96cb636-6076-4256-8622-93e09fe2fd42.png" alt="Couple avatar 3 for check-in" loading="lazy" />
                  <AvatarFallback>🤝</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="text-2xl">👫</div>
          </div>

          {/* Memory Vault */}
          <div className="flex items-center gap-4 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-poppins font-bold text-white">Memory Vault</h3>
              <div className="mt-2 flex -space-x-2">
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/379d21da-b57c-42de-8fa4-bb2cb2c617d5.png" alt="Couple avatar 1 for memory vault" loading="lazy" />
                  <AvatarFallback>MV</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/d445b99d-8fa2-4613-9412-94521632578d.png" alt="Couple avatar 2 for memory vault" loading="lazy" />
                  <AvatarFallback>📸</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border border-white/30">
                  <AvatarImage src="/lovable-uploads/e96cb636-6076-4256-8622-93e09fe2fd42.png" alt="Couple avatar 3 for memory vault" loading="lazy" />
                  <AvatarFallback>💝</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="w-16 h-16">
              <img 
                src="/lovable-uploads/5a655e7e-3004-45ee-bc2a-35b5292a98e2.png" 
                alt="Memory Vault Couple" 
                className="w-full h-full object-contain"
                loading="lazy"
              />
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