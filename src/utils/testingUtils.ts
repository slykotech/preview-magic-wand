import { supabase } from '@/integrations/supabase/client';

/**
 * Utility functions for testing and sandbox environments
 */

export const isTestEnvironment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('localhost') || 
         hostname.includes('127.0.0.1') ||
         hostname.includes('staging') || 
         hostname.includes('preview') ||
         hostname.includes('dev');
};

export const getEnvironmentType = (): 'development' | 'staging' | 'production' => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  } else if (hostname.includes('staging') || hostname.includes('preview')) {
    return 'staging';
  } else {
    return 'production';
  }
};

// Test user management
export interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  userType: 'free' | 'premium' | 'trial';
  partnerId?: string;
}

export const testUsers: Record<string, TestUser> = {
  free: {
    id: 'test-free-user',
    email: 'free@test.lovesync.com',
    password: 'TestPass123!',
    displayName: 'Free Test User',
    userType: 'free'
  },
  premium: {
    id: 'test-premium-user',
    email: 'premium@test.lovesync.com',
    password: 'TestPass123!',
    displayName: 'Premium Test User',
    userType: 'premium'
  },
  trial: {
    id: 'test-trial-user',
    email: 'trial@test.lovesync.com',
    password: 'TestPass123!',
    displayName: 'Trial Test User',
    userType: 'trial'
  },
  couple1: {
    id: 'test-couple-user-1',
    email: 'couple1@test.lovesync.com',
    password: 'TestPass123!',
    displayName: 'Couple Test User 1',
    userType: 'premium',
    partnerId: 'test-couple-user-2'
  },
  couple2: {
    id: 'test-couple-user-2',
    email: 'couple2@test.lovesync.com',
    password: 'TestPass123!',
    displayName: 'Couple Test User 2',
    userType: 'premium',
    partnerId: 'test-couple-user-1'
  }
};

export const quickLogin = async (userType: keyof typeof testUsers) => {
  if (!isTestEnvironment()) {
    throw new Error('Quick login only available in test environments');
  }

  const user = testUsers[userType];
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });

  if (error) {
    // If user doesn't exist, try to create them
    const { error: signUpError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          display_name: user.displayName,
          is_test_user: true,
          user_type: user.userType
        }
      }
    });

    if (signUpError) {
      throw new Error(`Failed to create or login test user: ${signUpError.message}`);
    }

    // Try login again after signup
    return await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
  }

  return { data, error };
};

export const createTestCouple = async (coupleKey: string = 'default') => {
  if (!isTestEnvironment()) {
    throw new Error('Test couple creation only available in test environments');
  }

  const timestamp = Date.now();
  const coupleId = `test-couple-${coupleKey}-${timestamp}`;
  const user1Id = `test-user-1-${coupleKey}-${timestamp}`;
  const user2Id = `test-user-2-${coupleKey}-${timestamp}`;

  // Create user 1
  const { data: user1, error: user1Error } = await supabase.auth.signUp({
    email: `user1-${coupleKey}-${timestamp}@test.lovesync.com`,
    password: 'TestPass123!',
    options: {
      data: {
        display_name: `Test Partner 1 (${coupleKey})`,
        is_test_user: true
      }
    }
  });

  if (user1Error) throw user1Error;

  // Create user 2
  const { data: user2, error: user2Error } = await supabase.auth.signUp({
    email: `user2-${coupleKey}-${timestamp}@test.lovesync.com`,
    password: 'TestPass123!',
    options: {
      data: {
        display_name: `Test Partner 2 (${coupleKey})`,
        is_test_user: true
      }
    }
  });

  if (user2Error) throw user2Error;

  if (!user1.user || !user2.user) {
    throw new Error('Failed to create test users');
  }

  // Create couple relationship
  const { error: coupleError } = await supabase
    .from('couples')
    .insert({
      user1_id: user1.user.id,
      user2_id: user2.user.id,
      relationship_start_date: new Date().toISOString().split('T')[0]
    });

  if (coupleError) throw coupleError;

  return {
    coupleId,
    user1: { id: user1.user.id, email: user1.user.email },
    user2: { id: user2.user.id, email: user2.user.email }
  };
};

export const generateMockData = async (coupleId: string) => {
  if (!isTestEnvironment()) {
    throw new Error('Mock data generation only available in test environments');
  }

  // Get couple info
  const { data: couple } = await supabase
    .from('couples')
    .select('id, user1_id, user2_id')
    .eq('id', coupleId)
    .single();

  if (!couple) {
    throw new Error('Couple not found');
  }

  // Generate daily check-ins for the past 7 days
  const moodTypes = ['happy', 'excited', 'content', 'anxious', 'sad', 'stressed'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    await supabase.from('daily_checkins').insert([
      {
        couple_id: coupleId,
        user_id: couple.user1_id,
        checkin_date: dateStr,
        mood: moodTypes[Math.floor(Math.random() * moodTypes.length)] as any,
        energy_level: Math.floor(Math.random() * 5) + 1,
        notes: `Test check-in ${i + 1}`
      },
      {
        couple_id: coupleId,
        user_id: couple.user2_id,
        checkin_date: dateStr,
        mood: moodTypes[Math.floor(Math.random() * moodTypes.length)] as any,
        energy_level: Math.floor(Math.random() * 5) + 1,
        notes: `Test check-in ${i + 1}`
      }
    ]);
  }

  // Generate some stories
  const storyTexts = [
    "Had an amazing dinner at the new restaurant downtown! 🍽️",
    "Went for a beautiful walk in the park today. 🌳",
    "Cooked our first meal together - it was delicious! 👨‍🍳",
    "Watched the sunset from our favorite spot. 🌅",
    "Tried that new coffee shop we talked about. ☕",
    "Had a movie night with our favorite films. 🎬"
  ];

  for (let i = 0; i < storyTexts.length; i++) {
    await supabase.from('stories').insert({
      couple_id: coupleId,
      user_id: Math.random() > 0.5 ? couple.user1_id : couple.user2_id,
      image_url: `https://picsum.photos/400/300?random=${i}`,
      caption: storyTexts[i]
    });
  }

  // Generate some memories
  const memoryTitles = [
    "Our First Date",
    "Trip to the Beach",
    "Anniversary Dinner",
    "Weekend Getaway"
  ];

  for (const title of memoryTitles) {
    await supabase.from('memories').insert({
      couple_id: coupleId,
      title: title,
      description: `A wonderful memory about ${title.toLowerCase()}`,
      memory_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_by: couple.user1_id
    });
  }

  return { success: true };
};

export const resetSandboxData = async () => {
  if (!isTestEnvironment()) {
    throw new Error('Sandbox reset only available in test environments');
  }

  // Delete test data in reverse dependency order
  const tables = [
    'card_responses',
    'card_deck_game_sessions', 
    'story_views',
    'story_responses',
    'stories',
    'daily_checkins',
    'memories',
    'messages',
    'conversations',
    'subscription_events',
    'couples',
    'profiles'
  ];

  for (const table of tables) {
    try {
      if (table === 'profiles' || table === 'subscription_events') {
        await supabase.from(table).delete().like('user_id', 'test-%');
        await supabase.from(table).delete().like('user_id', 'sandbox-%');
      } else if (table === 'couples' || table === 'stories' || table === 'daily_checkins' || table === 'memories') {
        await supabase.from(table).delete().like('couple_id', 'test-%');
        await supabase.from(table).delete().like('couple_id', 'sandbox-%');
      }
    } catch (error) {
      console.warn(`Failed to clear ${table}:`, error);
    }
  }

  return { success: true };
};

export const mockSubscriptionPurchase = async (userId: string, productId: string = 'premium_monthly') => {
  if (!isTestEnvironment()) {
    throw new Error('Mock purchases only available in test environments');
  }

  const expiresDate = new Date();
  if (productId.includes('monthly')) {
    expiresDate.setMonth(expiresDate.getMonth() + 1);
  } else if (productId.includes('yearly')) {
    expiresDate.setFullYear(expiresDate.getFullYear() + 1);
  } else if (productId.includes('lifetime')) {
    expiresDate.setFullYear(expiresDate.getFullYear() + 100);
  }

  const { error } = await supabase
    .from('subscription_events')
    .insert({
      user_id: userId,
      event_type: 'INITIAL_PURCHASE',
      product_id: productId,
      expires_date: expiresDate.toISOString(),
      is_active: true,
      is_sandbox: true
    });

  if (error) throw error;

  return { success: true, expires_date: expiresDate };
};

export const debugUserSubscription = async (userId: string) => {
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.group(`🔍 Debug User: ${userId}`);
  console.log('Profile:', profile);
  console.log('Subscription Events:', events);
  console.groupEnd();

  return { profile, events };
};

export const debugCoupleData = async (coupleId: string) => {
  const { data: couple } = await supabase
    .from('couples')
    .select(`
      *
    `)
    .eq('id', coupleId)
    .single();

  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('couple_id', coupleId)
    .order('checkin_date', { ascending: false })
    .limit(10);

  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(5);

  console.group(`💑 Debug Couple: ${coupleId}`);
  console.log('Couple Data:', couple);
  console.log('Recent Check-ins:', checkins);
  console.log('Recent Stories:', stories);
  console.groupEnd();

  return { couple, checkins, stories };
};

// Feature flags for testing
export const featureFlags = {
  development: {
    enableDebugMode: true,
    enableTestUsers: true,
    enableMockPayments: true,
    enableDataSeeding: true,
    showTestingPanel: true
  },
  staging: {
    enableDebugMode: true,
    enableTestUsers: true,
    enableMockPayments: false,
    enableDataSeeding: true,
    showTestingPanel: true
  },
  production: {
    enableDebugMode: false,
    enableTestUsers: false,
    enableMockPayments: false,
    enableDataSeeding: false,
    showTestingPanel: false
  }
};

export const getFeatureFlag = (flag: keyof typeof featureFlags.development): boolean => {
  const env = getEnvironmentType();
  return featureFlags[env][flag];
};