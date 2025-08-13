# LoveStory Mobile App Setup

This guide will help you run LoveStory as a native mobile app on iOS and Android devices.

## Prerequisites

- Node.js and npm installed
- For iOS: Mac with Xcode installed
- For Android: Android Studio installed

## Setup Instructions

### 1. Export to GitHub and Clone

1. Click the "Export to GitHub" button in the Lovable interface
2. Clone your repository to your local machine:
```bash
git clone [your-repo-url]
cd [your-repo-name]
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Mobile Platforms

Choose the platform(s) you want to target:

**For iOS:**
```bash
npx cap add ios
```

**For Android:**
```bash
npx cap add android
```

### 4. Build the Project

```bash
npm run build
```

### 5. Sync with Native Platforms

```bash
npx cap sync
```

### 6. Run on Device/Emulator

**For iOS:**
```bash
npx cap run ios
```

**For Android:**
```bash
npx cap run android
```

## Development Workflow

After making changes to your code:

1. Build the project: `npm run build`
2. Sync changes: `npx cap sync`
3. Run on your target platform

## RevenueCat Integration for Production

To implement in-app purchases with RevenueCat:

1. Create a RevenueCat account and project
2. Add your app to RevenueCat dashboard
3. Install RevenueCat plugin:
```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

4. Update the subscription hook to use actual RevenueCat SDK calls
5. Configure your products in App Store Connect / Google Play Console
6. Test with sandbox accounts

## Live Update Configuration

The app is configured for live updates during development:
- Server URL: `https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com`
- Changes made in Lovable will be reflected in your mobile app automatically

For production, remove the server URL from `capacitor.config.ts`.

## App Store Deployment

### iOS (App Store):
1. Update `capacitor.config.ts` with your final app ID
2. Configure signing in Xcode
3. Archive and upload to App Store Connect

### Android (Google Play):
1. Generate a signed APK/AAB in Android Studio
2. Upload to Google Play Console

## Troubleshooting

- **Build errors**: Run `npx cap doctor` to check setup
- **iOS issues**: Ensure Xcode command line tools are installed
- **Android issues**: Check Android SDK configuration in Android Studio
- **Sync issues**: Try `npx cap clean [platform]` then `npx cap sync`

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [Lovable Mobile Development Guide](https://lovable.dev/blogs/TODO)

---

**Note**: This app is configured for mobile-first experience with touch optimization, safe area handling, and mobile-specific animations.