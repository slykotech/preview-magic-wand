import { Home, Brain, Calendar, Heart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
  { id: 'dates', icon: Calendar, label: 'Dates', path: '/dates' },
  { id: 'therapy', icon: Brain, label: 'Therapy', path: '/therapy' },
  { id: 'vault', icon: Heart, label: 'Vault', path: '/vault' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
];

const NAV_BAR_HEIGHT = 64;

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect virtual keyboard on mobile
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      const heightDifference = windowHeight - viewportHeight;
      
      // Consider keyboard open if viewport height is significantly reduced
      const keyboardOpen = heightDifference > 150; // threshold for keyboard detection
      setIsKeyboardOpen(keyboardOpen);
    };

    const handleFocusIn = () => {
      // Small delay to allow viewport to adjust
      setTimeout(handleResize, 100);
    };

    const handleFocusOut = () => {
      // Small delay to allow viewport to adjust
      setTimeout(handleResize, 100);
    };

    // Listen to visual viewport changes (more reliable for keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Also listen to focus events on input elements
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Hide navigation when in chat/messages view or when keyboard is open
  if (location.pathname === '/messages' || isKeyboardOpen) {
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
    <>
      <div
        aria-hidden="true"
        className="w-full"
        style={{ height: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))` }}
      />
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-[100] pointer-events-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around py-1 px-2 sm:py-2 sm:px-4 max-w-md mx-auto">
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
                className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'text-primary transform scale-110' 
                    : 'text-muted-foreground hover:text-foreground hover:scale-105'
                }`}
              >
                <div className={item.id === 'therapy' ? 'relative' : ''}>
                  {item.id === 'therapy' ? (
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-80"></div>
                      <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-1">
                        <Icon 
                          size={18} 
                          className={`${getIconAnimation(item.id, isActive)} text-white`}
                        />
                      </div>
                    </div>
                  ) : (
                    <Icon 
                      size={22} 
                      className={`${getIconAnimation(item.id, isActive)}`}
                    />
                  )}
                </div>
                <span className={`text-xs font-inter ${isActive ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};