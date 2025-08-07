import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
interface GradientHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  showBackButton?: boolean;
  backRoute?: string;
  className?: string;
  children?: ReactNode;
}
export const GradientHeader = ({
  title,
  subtitle,
  icon,
  showBackButton = true,
  backRoute,
  className = "",
  children
}: GradientHeaderProps) => {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (backRoute) {
      navigate(backRoute);
    } else {
      navigate(-1);
    }
  };
  return <div className={`bg-gradient-romance text-white p-6 pb-8 shadow-romantic relative overflow-hidden rounded-b-[2rem] ${className}`}>
      {/* Background Pattern with curved overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 rounded-b-[2rem]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-24 -translate-y-24" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-12 translate-y-12 mb-8" />
      
      {/* Curved bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-b-[2rem] mb-4" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="text-white hover:bg-white/20 rounded-full h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
            {icon}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold font-poppins tracking-tight">{title}</h1>
            <p className="text-white/90 text-sm font-inter font-semibold mt-1">
              {subtitle}
            </p>
          </div>
        </div>
        
        {children && <div className="mt-6">
            {children}
          </div>}
      </div>
    </div>;
};