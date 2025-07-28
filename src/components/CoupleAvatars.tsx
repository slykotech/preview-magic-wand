import { useEffect, useState } from "react";
import coupleImage from "@/assets/couple-avatars.jpg";

interface CoupleAvatarsProps {
  syncScore: number;
  animated?: boolean;
}

export const CoupleAvatars = ({ syncScore, animated = true }: CoupleAvatarsProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const getProximityClass = (score: number) => {
    if (score >= 80) return "gap-2"; // Very close
    if (score >= 60) return "gap-4"; // Close
    if (score >= 40) return "gap-8"; // Moderate
    return "gap-12"; // Distant
  };

  const getAvatarMood = (score: number) => {
    if (score >= 80) return "brightness-110 saturate-110";
    if (score >= 60) return "brightness-105 saturate-105";
    if (score >= 40) return "brightness-100 saturate-100";
    return "brightness-95 saturate-95 grayscale-10";
  };

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Sync Connection Line */}
      {syncScore >= 60 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-24 h-0.5 bg-gradient-to-r from-sunrise-coral to-gold-accent animate-pulse"></div>
        </div>
      )}
      
      {/* Avatar Container */}
      <div className={`flex items-center justify-center ${getProximityClass(syncScore)} transition-all duration-1000 ease-love`}>
        {/* User Avatar */}
        <div className={`relative ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-romantic ring-4 ring-sunrise-coral/20">
            <img 
              src={coupleImage}
              alt="User Avatar"
              className={`w-full h-full object-cover object-left ${getAvatarMood(syncScore)} ${
                animated ? 'hover:scale-110' : ''
              } transition-all duration-300`}
            />
          </div>
          {/* Mood Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
            syncScore >= 80 ? 'bg-gold-accent animate-pulse' :
            syncScore >= 60 ? 'bg-sunrise-coral' :
            syncScore >= 40 ? 'bg-yellow-400' : 'bg-gray-400'
          }`}></div>
        </div>

        {/* Partner Avatar */}
        <div className={`relative ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-romantic ring-4 ring-sunrise-coral/20">
            <img 
              src={coupleImage}
              alt="Partner Avatar"
              className={`w-full h-full object-cover object-right ${getAvatarMood(syncScore)} ${
                animated ? 'hover:scale-110' : ''
              } transition-all duration-300`}
            />
          </div>
          {/* Mood Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
            syncScore >= 80 ? 'bg-gold-accent animate-pulse' :
            syncScore >= 60 ? 'bg-sunrise-coral' :
            syncScore >= 40 ? 'bg-yellow-400' : 'bg-gray-400'
          }`}></div>
        </div>
      </div>

      {/* Love Particles for High Sync */}
      {syncScore >= 90 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gold-accent rounded-full animate-float-love opacity-60"
              style={{
                left: `${20 + i * 25}%`,
                top: `${30 + i * 10}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i}s`
              }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};