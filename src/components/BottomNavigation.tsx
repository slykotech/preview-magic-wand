import { Home, MessageCircle, Calendar, Heart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'messages', icon: MessageCircle, label: 'Messages', path: '/messages' },
  { id: 'planner', icon: Calendar, label: 'Planner', path: '/planner' },
  { id: 'vault', icon: Heart, label: 'Vault', path: '/vault' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
];

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !coupleData?.id) return;

    const fetchUnreadCount = async () => {
      try {
        // Get conversation for this couple
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('couple_id', coupleData.id)
          .maybeSingle();

        if (!conversation) return;

        // Count unread messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for unread messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, coupleData?.id]);

  const getIconAnimation = (iconId: string, isActive: boolean) => {
    if (!isActive) return '';
    
    switch (iconId) {
      case 'home':
        return 'animate-float-love';
      case 'messages':
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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.id === 'home' 
            ? (location.pathname === '/' || location.pathname === '/dashboard')
            : location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-primary transform scale-110' 
                  : 'text-muted-foreground hover:text-foreground hover:scale-105'
              }`}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  className={`${getIconAnimation(item.id, isActive)}`}
                />
                {item.id === 'messages' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
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
  );
};