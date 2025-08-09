import { Home, MessageCircle, Calendar, Heart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
  { id: 'therapy', icon: MessageCircle, label: 'Therapy', path: '/therapy' },
  { id: 'dates', icon: Calendar, label: 'Dates', path: '/dates' },
  { id: 'vault', icon: Heart, label: 'Vault', path: '/vault' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
];

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navigation when in chat/messages view
  if (location.pathname === '/messages') {
    return null;
  }

  const getIconAnimation = (iconId: string, isActive: boolean) => {
    if (!isActive) return '';
    
    switch (iconId) {
      case 'home':
        return 'animate-float-love';
      case 'therapy':
        return 'animate-pulse';
      case 'dates':
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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-[100] pointer-events-auto">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.id === 'home' 
            ? (location.pathname === '/dashboard')
            : location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                try {
                  // Blur any focused input (iOS fix) before navigating
                  if (document && document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                } catch (e) {}
                console.info('BottomNavigation click', { id: item.id, path: item.path });
                // small timeout improves reliability on mobile
                setTimeout(() => navigate(item.path), 0);
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-primary transform scale-110' 
                  : 'text-muted-foreground hover:text-foreground hover:scale-105'
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