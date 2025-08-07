import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', { event, hasSession: !!session, user: session?.user?.email });
        
        // Handle logout events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          // Clear any app flow state to prevent automatic bypass
          localStorage.removeItem('love-sync-app-flow');
          return;
        }

        // Only allow access if user is authenticated AND email is confirmed
        const isVerified = session?.user?.email_confirmed_at != null;
        
        if (isVerified && session) {
          // For returning users, always clear flow state to force subscription check
          if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
            console.log('Clearing app flow state for returning user to enforce subscription flow');
            localStorage.removeItem('love-sync-app-flow');
          }
          
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', { hasSession: !!session, user: session?.user?.email });
      
      const isVerified = session?.user?.email_confirmed_at != null;
      
      if (isVerified && session) {
        // For any existing session, clear flow state to force proper subscription check
        console.log('Clearing app flow state for existing session to enforce subscription flow');
        localStorage.removeItem('love-sync-app-flow');
        
        setSession(session);
        setUser(session.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};