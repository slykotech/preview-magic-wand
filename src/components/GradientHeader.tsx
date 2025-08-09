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
  return <div className={`bg-gradient-romance text-white p-4 sm:p-6 pb-6 sm:pb-8 safe-area-top shadow-romantic relative overflow-hidden rounded-b-[2rem] ${className}`}>
      {/* Background Pattern with curved overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 rounded-b-[2rem]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-24 -translate-y-24" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-12 translate-y-12 mb-8" />
      
      {/* Curved bottom accent */}
      
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          {showBackButton && <Button variant="ghost" size="icon" onClick={handleBackClick} className="text-white hover:bg-white/20 rounded-full h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>}
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/10 [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-[1.75]">
            {icon}
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-extrabold font-poppins tracking-tight">{title}</h1>
            <p className="text-white/90 text-xs sm:text-sm font-inter font-semibold mt-1">
              {subtitle}
            </p>
          </div>
        </div>
        
        {children && <div className="mt-4 sm:mt-6">
            {children}
          </div>}
      </div>
    </div>;
};