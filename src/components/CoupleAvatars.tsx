import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import coupleImage from "@/assets/couple-avatars.jpg";

interface CoupleAvatarsProps {
  syncScore: number;
  animated?: boolean;
  onUserAvatarClick?: () => void;
  onPartnerAvatarClick?: () => void;
  onCameraClick?: () => void;
  hasUserStory?: boolean;
  hasPartnerStory?: boolean;
  isUserOnline?: boolean;
  isPartnerOnline?: boolean;
  userAvatarUrl?: string;
  partnerAvatarUrl?: string;
}

export const CoupleAvatars = ({ 
  syncScore, 
  animated = true, 
  onUserAvatarClick, 
  onPartnerAvatarClick,
  onCameraClick,
  hasUserStory = false,
  hasPartnerStory = false,
  isUserOnline = false,
  isPartnerOnline = false,
  userAvatarUrl,
  partnerAvatarUrl
}: CoupleAvatarsProps) => {
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
        <div 
          className={`relative ${isLoaded ? 'animate-fade-in' : 'opacity-0'} ${(hasUserStory && onUserAvatarClick) ? 'cursor-pointer' : ''}`}
          onClick={hasUserStory ? onUserAvatarClick : undefined}
        >
          {/* Gradient ring only if story exists */}
          {hasUserStory ? (
            <div className="w-24 h-24 rounded-full bg-gradient-primary p-0.5 hover:p-0 transition-all duration-300">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full overflow-hidden shadow-romantic">
                  <img 
                    src={userAvatarUrl || coupleImage}
                    alt="User Avatar"
                    className={`w-full h-full object-cover ${getAvatarMood(syncScore)} ${
                      animated ? 'hover:scale-110' : ''
                    } transition-all duration-300`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-romantic ring-4 ring-sunrise-coral/20">
              <img 
                src={userAvatarUrl || coupleImage}
                alt="User Avatar"
                className={`w-full h-full object-cover ${getAvatarMood(syncScore)} transition-all duration-300`}
              />
            </div>
          )}
          {/* Online Status Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background ${
            isUserOnline ? 'bg-success' : 'bg-destructive'
          }`}></div>
        </div>

        {/* Partner Avatar */}
        <div 
          className={`relative ${isLoaded ? 'animate-fade-in' : 'opacity-0'} ${(hasPartnerStory && onPartnerAvatarClick) ? 'cursor-pointer' : ''}`} 
          style={{ animationDelay: '200ms' }}
          onClick={hasPartnerStory ? onPartnerAvatarClick : undefined}
        >
          {/* Gradient ring only if story exists */}
          {hasPartnerStory ? (
            <div className="w-24 h-24 rounded-full bg-gradient-primary p-0.5 hover:p-0 transition-all duration-300">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full overflow-hidden shadow-romantic">
                  <img 
                    src={partnerAvatarUrl || coupleImage}
                    alt="Partner Avatar"
                    className={`w-full h-full object-cover ${getAvatarMood(syncScore)} ${
                      animated ? 'hover:scale-110' : ''
                    } transition-all duration-300`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-romantic ring-4 ring-sunrise-coral/20">
              <img 
                src={partnerAvatarUrl || coupleImage}
                alt="Partner Avatar"
                className={`w-full h-full object-cover ${getAvatarMood(syncScore)} transition-all duration-300`}
              />
            </div>
          )}
          {/* Online Status Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background ${
            isPartnerOnline ? 'bg-success' : 'bg-destructive'
          }`}></div>
        </div>
      </div>

      {/* Separate Camera Button for uploading stories */}
      {onCameraClick && (
        <div className="absolute top-0 left-0">
          <button
            onClick={onCameraClick}
            className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-full p-2 shadow-lg hover:scale-110 transition-all duration-300 border-2 border-white"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
      )}

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