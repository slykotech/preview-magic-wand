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
  return <div className={`bg-gradient-romance text-white p-6 shadow-romantic relative overflow-hidden ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-24 -translate-y-24" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-12 translate-y-12" />
      
      <div className="relative z-10">
        
        
        {children && <div className="mt-6">
            {children}
          </div>}
      </div>
    </div>;
};