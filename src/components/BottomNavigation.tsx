import { Home, MessageCircle, Calendar, Heart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'coach', icon: MessageCircle, label: 'Coach', path: '/coach' },
  { id: 'planner', icon: Calendar, label: 'Planner', path: '/planner' },
  { id: 'vault', icon: Heart, label: 'Vault', path: '/vault' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
];

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getIconAnimation = (iconId: string, isActive: boolean) => {
    if (!isActive) return '';
    
    switch (iconId) {
      case 'home':
        return 'animate-float-love';
      case 'coach':
        return 'animate-pulse';
      case 'planner':
        return 'animate-bounce';
      case 'vault':
        return 'animate-heart-pulse';
      case 'profile':
        return 'animate-float-love';
      default:
        return '';
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-twilight-blue/95 backdrop-blur-lg border-t border-white/10 z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-sunrise-coral transform scale-110' 
                  : 'text-white/70 hover:text-white hover:scale-105'
              }`}
            >
              <Icon 
                size={22} 
                className={`${getIconAnimation(item.id, isActive)}`}
              />
              <span className={`text-xs font-inter ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};