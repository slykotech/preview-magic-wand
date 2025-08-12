import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DashboardCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  expandedContent?: ReactNode;
  className?: string;
}

export const DashboardCard = ({ 
  title, 
  icon, 
  children, 
  expandedContent,
  className = ""
}: DashboardCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (expandedContent) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`bg-card rounded-2xl p-3 sm:p-6 shadow-soft hover:shadow-romantic transition-all duration-200 cursor-pointer transform hover:scale-102 ${
          isExpanded ? 'ring-2 ring-secondary/20' : ''
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-gradient-romance rounded-full text-white">
              {icon}
            </div>
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          {expandedContent && (
            <div className="text-muted-foreground">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {children}
        </div>
        
        {/* Expanded content */}
        {isExpanded && expandedContent && (
          <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-border animate-fade-in">
            {expandedContent}
          </div>
        )}
      </div>
      
      {/* Backdrop blur when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};