import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f135fec07ff24c8ca0e24c5badf6f0b1',
  appName: 'LoveSync',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3B82F6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;