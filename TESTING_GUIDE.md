# LoveStory Testing Guide

## Overview
This guide covers testing configurations and procedures for LoveStory across different environments.

## Testing Environments

### 1. Development Environment
- **URL**: Local development server
- **Database**: Local Supabase instance
- **Payments**: RevenueCat sandbox mode
- **Auth**: Test users only

### 2. Staging Environment
- **URL**: Staging deployment
- **Database**: Staging Supabase project
- **Payments**: RevenueCat sandbox mode
- **Auth**: Test users + limited real users

### 3. Production Environment
- **URL**: Live app
- **Database**: Production Supabase project
- **Payments**: RevenueCat production mode
- **Auth**: Real users only

## RevenueCat Sandbox Testing

### Setup Instructions

1. **Enable Sandbox Mode**
   ```typescript
   // In your RevenueCat configuration
   await Purchases.configure({
     apiKey: "your_sandbox_api_key",
     appUserID: "test_user_123"
   });
   
   // For testing, use sandbox purchases
   const offerings = await Purchases.getOfferings();
   ```

2. **Test Payment Flows**
   - Use sandbox Apple ID for iOS testing
   - Use test payment methods for Android
   - Verify subscription states and webhooks

### Test Scenarios

#### Subscription Lifecycle Testing
- [ ] Initial subscription purchase
- [ ] Subscription renewal
- [ ] Subscription cancellation
- [ ] Subscription expiration
- [ ] Failed payment handling
- [ ] Refund processing
- [ ] Plan upgrades/downgrades

#### Partner Invitation Testing
- [ ] Sending invitations to non-subscribers
- [ ] Accepting invitations
- [ ] Subscription sharing verification
- [ ] Access control validation

## Database Testing

### Test Data Setup

```sql
-- Create test couple
INSERT INTO public.couples (id, partner1_id, partner2_id, relationship_start_date)
VALUES (
  'test-couple-uuid',
  'test-user-1-uuid',
  'test-user-2-uuid',
  '2024-01-01'
);

-- Create test profiles
INSERT INTO public.profiles (user_id, display_name, avatar_url)
VALUES 
  ('test-user-1-uuid', 'Test User 1', 'https://example.com/avatar1.jpg'),
  ('test-user-2-uuid', 'Test User 2', 'https://example.com/avatar2.jpg');

-- Create test subscription
INSERT INTO public.subscription_events (
  user_id,
  event_type,
  product_id,
  expires_date,
  is_active
) VALUES (
  'test-user-1-uuid',
  'INITIAL_PURCHASE',
  'premium_monthly',
  NOW() + INTERVAL '1 month',
  true
);
```

### Test Data Cleanup

```sql
-- Cleanup script for test data
DELETE FROM public.card_deck_game_sessions WHERE couple_id LIKE 'test-%';
DELETE FROM public.stories WHERE couple_id LIKE 'test-%';
DELETE FROM public.daily_checkins WHERE couple_id LIKE 'test-%';
DELETE FROM public.subscription_events WHERE user_id LIKE 'test-%';
DELETE FROM public.couples WHERE id LIKE 'test-%';
DELETE FROM public.profiles WHERE user_id LIKE 'test-%';
```

## Feature Testing Checklist

### Authentication & Onboarding
- [ ] User registration
- [ ] Email verification
- [ ] Profile creation
- [ ] Partner connection flow
- [ ] Invitation handling

### Core Features
- [ ] Daily check-ins
- [ ] Mood tracking
- [ ] Story sharing
- [ ] Card deck games
- [ ] Chat messaging
- [ ] Date planning
- [ ] Memory vault

### Subscription Features
- [ ] Premium access validation
- [ ] Feature gating
- [ ] Subscription status sync
- [ ] Partner subscription sharing
- [ ] Billing webhook handling

### Game Features
- [ ] Card game creation
- [ ] Turn-based gameplay
- [ ] Photo submissions
- [ ] Timer functionality
- [ ] Game completion
- [ ] Statistics tracking

## API Testing

### Edge Function Testing

```typescript
// Test AI coach endpoint
const testAICoach = async () => {
  const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
    body: {
      message: "Test message",
      user_id: "test-user-uuid",
      couple_id: "test-couple-uuid"
    }
  });
  
  console.log('AI Coach Response:', data);
  if (error) console.error('Error:', error);
};

// Test event scraping
const testEventScraper = async () => {
  const { data, error } = await supabase.functions.invoke('google-events-scraper', {
    body: {
      location: "New York, NY",
      radius: 25,
      couple_id: "test-couple-uuid"
    }
  });
  
  console.log('Events:', data);
  if (error) console.error('Error:', error);
};
```

### Webhook Testing

```typescript
// Test RevenueCat webhook locally
const testWebhook = async () => {
  const webhookPayload = {
    event: {
      type: "INITIAL_PURCHASE",
      app_user_id: "test-user-uuid",
      product_id: "premium_monthly",
      expires_date: "2024-12-31T23:59:59Z"
    }
  };
  
  const response = await fetch('http://localhost:54321/functions/v1/revenuecat-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_WEBHOOK_SECRET'
    },
    body: JSON.stringify(webhookPayload)
  });
  
  console.log('Webhook Response:', await response.json());
};
```

## Performance Testing

### Load Testing Scenarios
1. **Concurrent Users**: Test with multiple users simultaneously
2. **Database Load**: Test with large datasets
3. **File Uploads**: Test photo upload performance
4. **Real-time Features**: Test WebSocket connections

### Monitoring
- Track response times
- Monitor database query performance
- Check memory usage
- Validate error rates

## Mobile Testing

### iOS Testing
```bash
# Build for iOS simulator
npx cap build ios
npx cap run ios

# Test on physical device
npx cap run ios --target="Your-Device-Name"
```

### Android Testing
```bash
# Build for Android
npx cap build android
npx cap run android

# Test on emulator
npx cap run android --target="Pixel_7_API_33"
```

### Mobile-Specific Tests
- [ ] Push notifications
- [ ] Camera integration
- [ ] File system access
- [ ] Background sync
- [ ] App store integration

## Automated Testing

### Jest Unit Tests
```typescript
// Example test for sync score calculation
import { calculateSyncScore } from '../src/utils/syncScore';

describe('Sync Score Calculation', () => {
  test('calculates correct score for active couple', () => {
    const mockData = {
      checkins: 5,
      stories: 3,
      messages: 20
    };
    
    const score = calculateSyncScore(mockData);
    expect(score).toBeGreaterThan(50);
  });
});
```

### Cypress E2E Tests
```typescript
// Example E2E test
describe('Card Game Flow', () => {
  it('should complete a full game session', () => {
    cy.visit('/games/card-deck');
    cy.get('[data-testid="start-game"]').click();
    cy.get('[data-testid="reveal-card"]').click();
    cy.get('[data-testid="submit-response"]').click();
    cy.get('[data-testid="game-complete"]').should('be.visible');
  });
});
```

## Test User Accounts

### Create Test Users
```typescript
const createTestUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: `Test User ${Date.now()}`,
        is_test_user: true
      }
    }
  });
  
  return { data, error };
};
```

### Test User Scenarios
- Single users (no partner)
- Coupled users (premium)
- Coupled users (free trial)
- Expired subscriptions
- Different relationship stages

## Security Testing

### Authentication Testing
- [ ] JWT token validation
- [ ] Session management
- [ ] Password requirements
- [ ] Rate limiting

### Authorization Testing
- [ ] RLS policy enforcement
- [ ] Feature access control
- [ ] Data isolation between couples
- [ ] Admin function restrictions

### Data Protection
- [ ] Personal data encryption
- [ ] Secure file storage
- [ ] API endpoint protection
- [ ] Input validation

## Troubleshooting Common Issues

### Database Issues
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify user permissions
SELECT * FROM auth.users WHERE email LIKE '%test%';
```

### Subscription Issues
```typescript
// Debug subscription status
const debugSubscription = async (userId: string) => {
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  console.log('Subscription Events:', events);
};
```

## Documentation

### Test Reports
- Generate test coverage reports
- Document test results
- Track performance metrics
- Log security scan results

### User Guides
- Create user testing guides
- Document feature workflows
- Provide troubleshooting steps
- Maintain test data catalogs

## Deployment Testing

### Pre-deployment Checklist
- [ ] All tests pass
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Security policies verified
- [ ] Performance benchmarks met

### Post-deployment Verification
- [ ] Health checks pass
- [ ] Critical features functional
- [ ] Monitoring alerts configured
- [ ] Backup systems operational

---

*Last updated: December 2024*
*Version: 1.0*