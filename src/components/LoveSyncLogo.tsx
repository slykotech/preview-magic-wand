import { Heart } from "lucide-react";

interface LoveSyncLogoProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export const LoveSyncLogo = ({ size = "md", animated = true }: LoveSyncLogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-20 h-20"
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <div className="absolute inset-0 bg-gradient-romance rounded-full opacity-20 blur-md"></div>
      <Heart 
        className={`${sizeClasses[size]} text-secondary ${animated ? 'animate-heart-pulse' : ''}`}
        fill="currentColor"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1/3 h-1/3 bg-accent rounded-full opacity-60 animate-pulse"></div>
      </div>
    </div>
  );
};