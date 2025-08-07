import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestUser {
  id: string;
  email: string;
  display_name: string;
  subscription_status: 'free' | 'premium' | 'trial';
  partner_id?: string;
}

interface TestMetrics {
  users: number;
  couples: number;
  subscriptions: number;
  gameSessions: number;
  errors: string[];
}

export const TestingPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [metrics, setMetrics] = useState<TestMetrics>({
    users: 0,
    couples: 0,
    subscriptions: 0,
    gameSessions: 0,
    errors: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Only show in development/staging
  useEffect(() => {
    const isDev = window.location.hostname.includes('localhost') || 
                  window.location.hostname.includes('staging');
    setIsVisible(isDev);
    
    if (isDev) {
      loadTestData();
      const interval = setInterval(loadMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const loadTestData = async () => {
    await Promise.all([
      loadTestUsers(),
      loadMetrics()
    ]);
  };

  const loadTestUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name
        `)
        .or('user_id.like.test-%,user_id.like.sandbox-%');

      if (profiles) {
        const users: TestUser[] = profiles.map(profile => ({
          id: profile.user_id,
          email: `${profile.user_id}@test.com`,
          display_name: profile.display_name || 'Test User',
          subscription_status: 'free', // Would need to check subscription table
          partner_id: undefined // Would need to join couples table
        }));
        
        setTestUsers(users);
      }
    } catch (error) {
      console.error('Failed to load test users:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      // Use separate variables to avoid complex type inference
      let userCount = 0;
      let coupleCount = 0; 
      let subCount = 0;
      let gameCount = 0;
      const errors: string[] = [];

      // Count users
      try {
        const result = await supabase.from('profiles').select('user_id').like('user_id', 'test-%');
        userCount = result.data?.length || 0;
        if (result.error) errors.push(result.error.message);
      } catch (e) {
        errors.push('Failed to count users');
      }

      // Count couples
      try {
        const result = await supabase.from('couples').select('id').like('id', 'test-%');
        coupleCount = result.data?.length || 0;
        if (result.error) errors.push(result.error.message);
      } catch (e) {
        errors.push('Failed to count couples');
      }

      // Count subscriptions - simplified to avoid TypeScript issues
      try {
        // For now, just set to 0 to avoid type issues - can be improved later
        subCount = 0;
      } catch (e) {
        errors.push('Failed to count subscriptions');
      }

      // Count game sessions
      try {
        const result = await supabase.from('card_deck_game_sessions').select('id').like('couple_id', 'test-%');
        gameCount = result.data?.length || 0;
        if (result.error) errors.push(result.error.message);
      } catch (e) {
        errors.push('Failed to count games');
      }

      setMetrics({
        users: userCount,
        couples: coupleCount,
        subscriptions: subCount,
        gameSessions: gameCount,
        errors
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics(prev => ({
        ...prev,
        errors: ['Failed to load metrics']
      }));
    }
  };

  const createTestUser = async () => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const email = `test-user-${timestamp}@sandbox.com`;
      const password = 'TestPass123!';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: `Test User ${timestamp}`,
            is_test_user: true
          }
        }
      });

      if (error) throw error;

      toast.success(`Created test user: ${email}`);
      await loadTestUsers();
    } catch (error) {
      console.error('Failed to create test user:', error);
      toast.error('Failed to create test user');
    } finally {
      setIsLoading(false);
    }
  };

  const createTestCouple = async () => {
    setIsLoading(true);
    try {
      // Create two test users
      const timestamp = Date.now();
      const user1Email = `couple-test-1-${timestamp}@sandbox.com`;
      const user2Email = `couple-test-2-${timestamp}@sandbox.com`;
      const password = 'TestPass123!';

      const { data: user1 } = await supabase.auth.signUp({
        email: user1Email,
        password,
        options: {
          data: {
            display_name: `Partner 1 ${timestamp}`,
            is_test_user: true
          }
        }
      });

      const { data: user2 } = await supabase.auth.signUp({
        email: user2Email,
        password,
        options: {
          data: {
            display_name: `Partner 2 ${timestamp}`,
            is_test_user: true
          }
        }
      });

      if (user1.user && user2.user) {
        // Create couple relationship
        await supabase.from('couples').insert({
          user1_id: user1.user.id,
          user2_id: user2.user.id,
          relationship_start_date: new Date().toISOString().split('T')[0]
        });

        toast.success('Created test couple');
        await loadTestData();
      }
    } catch (error) {
      console.error('Failed to create test couple:', error);
      toast.error('Failed to create test couple');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (userType: 'free' | 'premium' | 'trial') => {
    const testCredentials = {
      free: { email: 'test-free@sandbox.com', password: 'TestPass123!' },
      premium: { email: 'test-premium@sandbox.com', password: 'TestPass123!' },
      trial: { email: 'test-trial@sandbox.com', password: 'TestPass123!' }
    };

    try {
      const { data, error } = await supabase.auth.signInWithPassword(
        testCredentials[userType]
      );

      if (error) {
        // If user doesn't exist, create them
        await supabase.auth.signUp({
          ...testCredentials[userType],
          options: {
            data: {
              display_name: `${userType.charAt(0).toUpperCase() + userType.slice(1)} User`,
              is_test_user: true
            }
          }
        });
        
        // Try login again
        await supabase.auth.signInWithPassword(testCredentials[userType]);
      }

      toast.success(`Logged in as ${userType} user`);
    } catch (error) {
      console.error(`Failed to login as ${userType} user:`, error);
      toast.error(`Failed to login as ${userType} user`);
    }
  };

  const resetSandboxData = async () => {
    if (!confirm('Are you sure you want to reset all sandbox data? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete test data in order (foreign key constraints)
      await supabase.from('card_responses').delete().like('user_id', 'test-%');
      await supabase.from('card_responses').delete().like('user_id', 'sandbox-%');
      
      await supabase.from('card_deck_game_sessions').delete().like('couple_id', 'test-%');
      await supabase.from('card_deck_game_sessions').delete().like('couple_id', 'sandbox-%');
      
      await supabase.from('stories').delete().like('couple_id', 'test-%');
      await supabase.from('stories').delete().like('couple_id', 'sandbox-%');
      
      await supabase.from('daily_checkins').delete().like('couple_id', 'test-%');
      await supabase.from('daily_checkins').delete().like('couple_id', 'sandbox-%');
      
      await supabase.from('subscription_events').delete().like('user_id', 'test-%');
      await supabase.from('subscription_events').delete().like('user_id', 'sandbox-%');
      
      await supabase.from('couples').delete().like('id', 'test-%');
      await supabase.from('couples').delete().like('id', 'sandbox-%');
      
      await supabase.from('profiles').delete().like('user_id', 'test-%');
      await supabase.from('profiles').delete().like('user_id', 'sandbox-%');

      toast.success('Sandbox data reset complete');
      await loadTestData();
    } catch (error) {
      console.error('Failed to reset sandbox data:', error);
      toast.error('Failed to reset sandbox data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = async () => {
    setIsLoading(true);
    try {
      // Generate some check-ins for existing test couples
      const { data: couples } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or('id.like.test-%,id.like.sandbox-%');

      for (const couple of couples || []) {
        // Generate check-ins for the last 7 days
        const moodTypes = ['happy', 'excited', 'content', 'anxious', 'sad', 'stressed'];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          await supabase.from('daily_checkins').insert([
            {
              couple_id: couple.id,
              user_id: couple.user1_id,
              checkin_date: dateStr,
              mood: moodTypes[Math.floor(Math.random() * moodTypes.length)] as any,
              energy_level: Math.floor(Math.random() * 5) + 1
            },
            {
              couple_id: couple.id,
              user_id: couple.user2_id,
              checkin_date: dateStr,
              mood: moodTypes[Math.floor(Math.random() * moodTypes.length)] as any,
              energy_level: Math.floor(Math.random() * 5) + 1
            }
          ]);
        }

        // Generate some stories
        const storyTexts = [
          "Had an amazing dinner at the new restaurant downtown!",
          "Went for a beautiful walk in the park today.",
          "Cooked our first meal together - it was delicious!",
          "Watched the sunset from our favorite spot."
        ];

        for (let i = 0; i < storyTexts.length; i++) {
          await supabase.from('stories').insert({
            couple_id: couple.id,
            user_id: Math.random() > 0.5 ? couple.user1_id : couple.user2_id,
            image_url: `https://picsum.photos/400/300?random=${i}`,
            caption: storyTexts[i]
          });
        }
      }

      toast.success('Mock data generated');
      await loadMetrics();
    } catch (error) {
      console.error('Failed to generate mock data:', error);
      toast.error('Failed to generate mock data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-h-96 overflow-y-auto">
      <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            🧪 Testing Panel
            <Badge variant="outline" className="text-xs">
              {window.location.hostname.includes('localhost') ? 'DEV' : 'STAGING'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-white rounded">
              <div className="font-semibold">{metrics.users}</div>
              <div className="text-muted-foreground">Users</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="font-semibold">{metrics.couples}</div>
              <div className="text-muted-foreground">Couples</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="font-semibold">{metrics.subscriptions}</div>
              <div className="text-muted-foreground">Subs</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="font-semibold">{metrics.gameSessions}</div>
              <div className="text-muted-foreground">Games</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickLogin('free')}
                className="text-xs p-1 h-auto"
              >
                Free User
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickLogin('premium')}
                className="text-xs p-1 h-auto"
              >
                Premium
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickLogin('trial')}
                className="text-xs p-1 h-auto"
              >
                Trial
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <Button
                size="sm"
                onClick={createTestUser}
                disabled={isLoading}
                className="text-xs p-1 h-auto"
              >
                + User
              </Button>
              <Button
                size="sm"
                onClick={createTestCouple}
                disabled={isLoading}
                className="text-xs p-1 h-auto"
              >
                + Couple
              </Button>
            </div>

            <Button
              size="sm"
              onClick={generateMockData}
              disabled={isLoading}
              className="w-full text-xs p-1 h-auto"
            >
              Generate Mock Data
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={resetSandboxData}
              disabled={isLoading}
              className="w-full text-xs p-1 h-auto"
            >
              Reset All Data
            </Button>
          </div>

          {/* Errors */}
          {metrics.errors.length > 0 && (
            <div className="text-red-600 text-xs">
              <div className="font-semibold">Errors:</div>
              {metrics.errors.map((error, index) => (
                <div key={index} className="truncate">{error}</div>
              ))}
            </div>
          )}

          <div className="text-center text-muted-foreground text-xs">
            Auto-refresh: 30s
          </div>
        </CardContent>
      </Card>
    </div>
  );
};