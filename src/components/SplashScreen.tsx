import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowContent(true);
    }, 500); // Content appears after 500ms

    const timer2 = setTimeout(() => {
      onComplete();
    }, 3000); // Splash screen shows for 3 seconds total

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-between relative overflow-hidden px-4">
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-secondary opacity-30 pointer-events-none"></div>

      {/* Logo Container - Centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center">
          <img
            src="/lovable-uploads/379d21da-b57c-42de-8fa4-bb2cb2c617d5.png"
            alt="Love Sync Logo"
            className={`w-40 h-40 rounded-xl shadow-lg object-contain bg-white transition-all duration-1000 ${showContent ? 'zoomout' : ''}`}
            style={{ objectFit: 'contain', background: 'white' }}
          />
        </div>
      </div>

      {/* Zoom Out Animation CSS */}
      <style>{`
        .zoomout {
          animation: zoomout 1.2s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        @keyframes zoomout {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.7);
            opacity: 0.7;
          }
        }
      `}</style>

      {/* App Name and Tagline - Bottom */}
      <div className={`pb-12 transition-all duration-1000 delay-300 text-center ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Love Sync</h1>
        <p className="text-sm text-white/80 font-semibold">A relationship co-pilot</p>
      </div>
    </div>
  );
};

export default SplashScreen;