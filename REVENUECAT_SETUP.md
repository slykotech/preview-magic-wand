# RevenueCat Integration Setup Guide

Your app is now configured with RevenueCat for subscription management! Here's what you need to do to complete the setup:

## 🎯 Current Status
✅ RevenueCat SDK installed and integrated  
✅ Subscription UI components ready  
✅ Fallback to localStorage for web testing  
⏳ Needs RevenueCat account setup  
⏳ Needs API keys configuration  

## 📋 Setup Steps

### 1. Create RevenueCat Account
1. Go to [RevenueCat](https://www.revenuecat.com) and create an account
2. Create a new app in the RevenueCat dashboard
3. Add your iOS and Android app configurations

### 2. Configure App Store/Google Play Products
**In App Store Connect (iOS):**
1. Create your subscription products with these identifiers:
   - `monthly_premium` - Monthly subscription
   - `quarterly_premium` - Quarterly subscription  
   - `yearly_premium` - Yearly subscription

**In Google Play Console (Android):**
1. Create the same subscription products with matching identifiers

### 3. Set up RevenueCat Products & Offerings
1. In RevenueCat dashboard, create products matching your store identifiers
2. Create an offering called "current" with your subscription packages
3. Configure entitlements (e.g., "premium_access")

### 4. Get API Keys
1. From RevenueCat dashboard → App Settings → API Keys
2. Copy your iOS and Android API keys

### 5. Add API Keys to Supabase Secrets
You need to store your RevenueCat API keys securely:

**Option A: Update the code with your keys**
Replace these lines in `src/hooks/useSubscription.tsx` (lines 28-30):
```typescript
const apiKey = Capacitor.getPlatform() === 'ios' 
  ? 'your_actual_ios_api_key_here' 
  : 'your_actual_android_api_key_here';
```

**Option B: Use Supabase secrets (recommended)**
1. In your Supabase dashboard → Edge Functions → Manage Secrets
2. Add these secrets:
   - `REVENUECAT_IOS_API_KEY`
   - `REVENUECAT_ANDROID_API_KEY`
3. Update the initialization code to use environment variables

### 6. Build and Test
```bash
# Sync with native platforms
npx cap sync

# Run on iOS
npx cap run ios

# Run on Android  
npx cap run android
```

## 🔧 What's Already Configured

### ✅ Subscription Hook (`useSubscription`)
- Automatically initializes RevenueCat on native platforms
- Loads subscription plans from RevenueCat offerings
- Handles purchase flow with RevenueCat SDK
- Manages subscription status and restoration
- Falls back to localStorage on web for testing

### ✅ UI Components
- `SubscriptionSection` component displays plans and handles purchases
- Works with both RevenueCat data and fallback plans
- Handles loading states and error management

### ✅ Purchase Flow
1. User selects a plan
2. RevenueCat handles the native purchase dialog
3. App receives purchase confirmation
4. Subscription status updates automatically
5. User gets access to premium features

## 🚀 Testing

### Web Testing (Current)
- Uses localStorage to simulate subscriptions
- All UI components work as expected
- No actual payments processed

### Mobile Testing (After Setup)
- Use TestFlight (iOS) or Internal Testing (Android)
- Test with sandbox accounts
- Verify purchase flow and restoration

## 📱 Production Deployment

1. Remove the development server URL from `capacitor.config.ts`
2. Update app IDs to your production bundle identifiers
3. Submit to App Store and Google Play with subscription products
4. Monitor subscription analytics in RevenueCat dashboard

## 🔒 Security Notes

- API keys are only used on the client side for RevenueCat
- Never store payment credentials in your app
- RevenueCat handles all payment processing securely
- Subscription validation happens server-side via RevenueCat

## 📊 Analytics & Monitoring

RevenueCat provides built-in analytics for:
- Subscription conversion rates
- Churn analysis  
- Revenue tracking
- A/B testing for pricing

Access these in your RevenueCat dashboard once live.

---

Your subscription system is ready! Complete the setup steps above to enable real subscription processing.