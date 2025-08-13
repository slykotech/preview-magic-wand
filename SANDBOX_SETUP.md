# LoveSync Sandbox Configuration Guide

## Overview
This guide walks through setting up sandbox environments for testing LoveSync's payment systems, subscription flows, and partner invitation features.

## RevenueCat Sandbox Setup

### 1. RevenueCat Configuration

#### Development Environment
```typescript
// src/config/revenuecat.ts
export const revenueCatConfig = {
  development: {
    apiKey: process.env.NODE_ENV === 'development' 
      ? 'rcat_dev_sandbox_key' 
      : 'rcat_prod_key',
    useSandbox: true,
    enableDebugLogs: true
  },
  production: {
    apiKey: 'rcat_prod_key',
    useSandbox: false,
    enableDebugLogs: false
  }
};
```

#### Sandbox API Keys
1. Go to RevenueCat Dashboard → Project Settings → API Keys
2. Copy your **Sandbox** API key
3. Add to your environment:
   ```bash
   REVENUECAT_SANDBOX_API_KEY=rcat_dev_xxxxxxxxxxxxxxxx
   REVENUECAT_PRODUCTION_API_KEY=rcat_prod_xxxxxxxxxxxxxxxx
   ```

### 2. iOS Sandbox Testing

#### Create Sandbox Apple ID
1. Go to App Store Connect → Users and Access → Sandbox Testers
2. Create new sandbox tester:
   ```
   Email: test-user-1@lovesync-sandbox.com
   Password: TestPass123!
   First Name: Test
   Last Name: User
   Date of Birth: 01/01/1990
   Territory: United States
   ```

#### Test Device Setup
```bash
# Sign out of App Store on test device
# Sign in with sandbox Apple ID
# Install test build through TestFlight or Xcode
```

#### Subscription Products (iOS)
```
Product IDs:
- lovesync.premium.monthly.sandbox
- lovesync.premium.yearly.sandbox
- lovesync.premium.lifetime.sandbox

Pricing:
- Monthly: $9.99 USD
- Yearly: $79.99 USD  
- Lifetime: $199.99 USD
```

### 3. Android Sandbox Testing

#### Google Play Console Setup
1. Upload signed APK to Internal Testing track
2. Add test users to Internal Testing
3. Configure test subscriptions:
   ```
   Product IDs:
   - lovesync_premium_monthly_sandbox
   - lovesync_premium_yearly_sandbox
   - lovesync_premium_lifetime_sandbox
   ```

#### Test Account Configuration
```json
{
  "test_accounts": [
    "testuser1@gmail.com",
    "testuser2@gmail.com",
    "coupletest1@gmail.com",
    "coupletest2@gmail.com"
  ],
  "license_testing": "LICENSED",
  "test_purchase_enabled": true
}
```

## Supabase Sandbox Environment

### 1. Create Staging Project
```bash
# Create new Supabase project for staging
PROJECT_NAME="lovesync-staging"
REGION="us-east-1"

# Copy production schema to staging
supabase db dump --project-ref production-ref > staging-schema.sql
supabase db reset --project-ref staging-ref
supabase db push --project-ref staging-ref --file staging-schema.sql
```

### 2. Environment Configuration
```typescript
// src/config/supabase.ts
const supabaseConfig = {
  development: {
    url: 'https://kdbgwmtihgmialrmaecn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    enableRealtime: true
  },
  staging: {
    url: 'https://staging-project-ref.supabase.co',
    anonKey: 'staging-anon-key...',
    enableRealtime: true
  },
  production: {
    url: 'https://prod-project-ref.supabase.co',
    anonKey: 'prod-anon-key...',
    enableRealtime: true
  }
};

export const supabase = createClient(
  supabaseConfig[process.env.NODE_ENV || 'development'].url,
  supabaseConfig[process.env.NODE_ENV || 'development'].anonKey
);
```

### 3. Test Data Population
```sql
-- Insert sandbox test couples
INSERT INTO public.couples (id, partner1_id, partner2_id, relationship_start_date) VALUES
('sandbox-couple-1', 'sandbox-user-1', 'sandbox-user-2', '2024-01-01'),
('sandbox-couple-2', 'sandbox-user-3', 'sandbox-user-4', '2024-02-15'),
('sandbox-couple-3', 'sandbox-user-5', 'sandbox-user-6', '2024-03-20');

-- Insert test profiles
INSERT INTO public.profiles (user_id, display_name, avatar_url) VALUES
('sandbox-user-1', 'Alice Sandbox', 'https://picsum.photos/200/200?random=1'),
('sandbox-user-2', 'Bob Sandbox', 'https://picsum.photos/200/200?random=2'),
('sandbox-user-3', 'Carol Sandbox', 'https://picsum.photos/200/200?random=3'),
('sandbox-user-4', 'Dave Sandbox', 'https://picsum.photos/200/200?random=4'),
('sandbox-user-5', 'Eve Sandbox', 'https://picsum.photos/200/200?random=5'),
('sandbox-user-6', 'Frank Sandbox', 'https://picsum.photos/200/200?random=6');

-- Insert test subscription events
INSERT INTO public.subscription_events (user_id, event_type, product_id, expires_date, is_active) VALUES
('sandbox-user-1', 'INITIAL_PURCHASE', 'premium_monthly', NOW() + INTERVAL '1 month', true),
('sandbox-user-3', 'INITIAL_PURCHASE', 'premium_yearly', NOW() + INTERVAL '1 year', true),
('sandbox-user-5', 'TRIAL_STARTED', 'premium_trial', NOW() + INTERVAL '7 days', true);
```

## Payment Flow Testing

### 1. Subscription Purchase Flow
```typescript
// Test subscription purchase
const testSubscriptionPurchase = async () => {
  try {
    // Get available offerings
    const offerings = await Purchases.getOfferings();
    const monthlyPackage = offerings.current?.monthly;
    
    if (monthlyPackage) {
      // Purchase package
      const { purchaserInfo } = await Purchases.purchasePackage(monthlyPackage);
      
      // Verify subscription status
      console.log('Active subscriptions:', purchaserInfo.activeSubscriptions);
      
      // Test webhook trigger
      await testWebhookDelivery(purchaserInfo.originalAppUserId);
    }
  } catch (error) {
    console.error('Purchase failed:', error);
  }
};
```

### 2. Partner Invitation Testing
```typescript
// Test partner invitation with subscription sharing
const testPartnerInvitation = async () => {
  const testScenarios = [
    {
      inviter: 'sandbox-user-1', // Has premium
      invitee: 'sandbox-user-7', // No subscription
      expectedResult: 'access_granted'
    },
    {
      inviter: 'sandbox-user-8', // No premium
      invitee: 'sandbox-user-9', // No subscription  
      expectedResult: 'upgrade_required'
    }
  ];
  
  for (const scenario of testScenarios) {
    const result = await supabase.functions.invoke('invite-partner', {
      body: {
        inviter_id: scenario.inviter,
        invitee_email: `${scenario.invitee}@sandbox.com`
      }
    });
    
    console.log(`Scenario ${scenario.inviter} → ${scenario.invitee}:`, result);
  }
};
```

### 3. Webhook Testing
```typescript
// Test RevenueCat webhook delivery
const testWebhookDelivery = async (appUserId: string) => {
  const webhookPayload = {
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: appUserId,
      product_id: 'premium_monthly',
      expires_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_sandbox: true
    }
  };
  
  const response = await fetch('/api/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer webhook-secret'
    },
    body: JSON.stringify(webhookPayload)
  });
  
  console.log('Webhook response:', await response.json());
};
```

## Test User Management

### 1. Create Test Users
```typescript
// Automated test user creation
const createTestUsers = async () => {
  const testUsers = [
    { email: 'alice@sandbox.lovesync.com', name: 'Alice Test' },
    { email: 'bob@sandbox.lovesync.com', name: 'Bob Test' },
    { email: 'carol@sandbox.lovesync.com', name: 'Carol Test' },
    { email: 'dave@sandbox.lovesync.com', name: 'Dave Test' }
  ];
  
  for (const user of testUsers) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: 'SandboxTest123!',
      options: {
        data: {
          display_name: user.name,
          is_test_user: true
        }
      }
    });
    
    if (error) {
      console.error(`Failed to create ${user.email}:`, error);
    } else {
      console.log(`Created test user: ${user.email}`);
    }
  }
};
```

### 2. Test User Login
```typescript
// Quick login for testing
const quickLogin = async (userType: 'premium' | 'free' | 'trial') => {
  const credentials = {
    premium: { email: 'alice@sandbox.lovesync.com', password: 'SandboxTest123!' },
    free: { email: 'carol@sandbox.lovesync.com', password: 'SandboxTest123!' },
    trial: { email: 'eve@sandbox.lovesync.com', password: 'SandboxTest123!' }
  };
  
  const { data, error } = await supabase.auth.signInWithPassword(
    credentials[userType]
  );
  
  if (!error) {
    console.log(`Logged in as ${userType} user:`, data.user?.email);
  }
  
  return { data, error };
};
```

## Environment Switching

### 1. Environment Detection
```typescript
// src/utils/environment.ts
export const getEnvironment = () => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  } else if (hostname.includes('staging') || hostname.includes('preview')) {
    return 'staging';
  } else {
    return 'production';
  }
};

export const isTestEnvironment = () => {
  return ['development', 'staging'].includes(getEnvironment());
};
```

### 2. Feature Flags for Testing
```typescript
// src/config/features.ts
export const featureFlags = {
  development: {
    enableDebugMode: true,
    enableTestUsers: true,
    enableMockPayments: true,
    enableDataSeeding: true
  },
  staging: {
    enableDebugMode: true,
    enableTestUsers: true,
    enableMockPayments: false,
    enableDataSeeding: true
  },
  production: {
    enableDebugMode: false,
    enableTestUsers: false,
    enableMockPayments: false,
    enableDataSeeding: false
  }
};
```

## Testing Utilities

### 1. Sandbox Reset Tool
```typescript
// src/utils/sandboxReset.ts
export const resetSandboxData = async () => {
  if (!isTestEnvironment()) {
    throw new Error('Sandbox reset only allowed in test environments');
  }
  
  // Clear test data
  await supabase.from('card_deck_game_sessions').delete().like('couple_id', 'sandbox-%');
  await supabase.from('stories').delete().like('couple_id', 'sandbox-%');
  await supabase.from('daily_checkins').delete().like('couple_id', 'sandbox-%');
  await supabase.from('subscription_events').delete().like('user_id', 'sandbox-%');
  
  // Recreate fresh test data
  await populateTestData();
  
  console.log('Sandbox data reset complete');
};
```

### 2. Mock Data Generator
```typescript
// src/utils/mockData.ts
export const generateMockData = async (coupleId: string) => {
  // Generate check-ins
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    await supabase.from('daily_checkins').insert([
      {
        couple_id: coupleId,
        user_id: 'sandbox-user-1',
        checkin_date: date.toISOString().split('T')[0],
        mood: Math.floor(Math.random() * 5) + 1,
        energy_level: Math.floor(Math.random() * 5) + 1
      },
      {
        couple_id: coupleId,
        user_id: 'sandbox-user-2',
        checkin_date: date.toISOString().split('T')[0],
        mood: Math.floor(Math.random() * 5) + 1,
        energy_level: Math.floor(Math.random() * 5) + 1
      }
    ]);
  }
  
  // Generate stories
  const storyTexts = [
    "Had an amazing dinner at the new restaurant downtown!",
    "Went for a beautiful walk in the park today.",
    "Cooked our first meal together - it was delicious!",
    "Watched the sunset from our favorite spot."
  ];
  
  for (const text of storyTexts) {
    await supabase.from('stories').insert({
      couple_id: coupleId,
      user_id: Math.random() > 0.5 ? 'sandbox-user-1' : 'sandbox-user-2',
      content: text,
      story_type: 'text'
    });
  }
};
```

## Monitoring & Debugging

### 1. Sandbox Monitoring Dashboard
```typescript
// src/components/SandboxMonitor.tsx
export const SandboxMonitor = () => {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    subscriptions: 0,
    gamesSessions: 0,
    errors: []
  });
  
  useEffect(() => {
    if (isTestEnvironment()) {
      fetchSandboxMetrics();
      const interval = setInterval(fetchSandboxMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, []);
  
  const fetchSandboxMetrics = async () => {
    // Fetch sandbox metrics
    const { data: users } = await supabase
      .from('profiles')
      .select('count')
      .like('user_id', 'sandbox-%');
      
    // Update metrics
    setMetrics({
      activeUsers: users?.length || 0,
      subscriptions: 0, // Add subscription count
      gamesSessions: 0, // Add games count
      errors: [] // Add error monitoring
    });
  };
  
  if (!isTestEnvironment()) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 p-4 rounded-lg shadow">
      <h3>Sandbox Monitor</h3>
      <p>Active Users: {metrics.activeUsers}</p>
      <p>Subscriptions: {metrics.subscriptions}</p>
      <p>Game Sessions: {metrics.gamesSessions}</p>
    </div>
  );
};
```

### 2. Debug Tools
```typescript
// src/utils/debugTools.ts
export const debugSubscription = async (userId: string) => {
  const { data } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  console.table(data);
  return data;
};

export const debugPartnerConnection = async (coupleId: string) => {
  const { data } = await supabase
    .from('couples')
    .select(`
      *,
      partner1:profiles!couples_partner1_id_fkey(*),
      partner2:profiles!couples_partner2_id_fkey(*)
    `)
    .eq('id', coupleId)
    .single();
    
  console.log('Couple Details:', data);
  return data;
};
```

## Deployment & CI/CD

### 1. Staging Deployment
```yaml
# .github/workflows/staging.yml
name: Deploy to Staging
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm run build
        env:
          NODE_ENV: staging
          VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
      
      - run: npm run test:staging
      - run: npm run deploy:staging
```

### 2. Automated Testing
```typescript
// tests/sandbox.test.ts
describe('Sandbox Environment', () => {
  beforeEach(async () => {
    await resetSandboxData();
  });
  
  test('subscription purchase flow', async () => {
    await quickLogin('free');
    // Test subscription purchase
    // Verify access changes
  });
  
  test('partner invitation flow', async () => {
    await quickLogin('premium');
    // Test invitation sending
    // Verify partner receives access
  });
  
  test('game session creation', async () => {
    await quickLogin('premium');
    // Test game creation
    // Verify both partners can play
  });
});
```

---

*This guide should be updated as new features are added to LoveSync.*
*Last updated: December 2024*