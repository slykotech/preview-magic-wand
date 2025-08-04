import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core'

// Initialize mobile-specific features
if (Capacitor.isNativePlatform()) {
  // Hide splash screen after app loads
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    SplashScreen.hide();
  });
  
  // Set status bar style for mobile
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light });
  }).catch(() => {
    // Status bar plugin not available
  });
}

createRoot(document.getElementById("root")!).render(<App />);
