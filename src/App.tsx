import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import SplashScreen from "./components/SplashScreen";
import { SignupPermissionsFlow } from "./components/SignupPermissionsFlow";
import { usePermissions } from "./hooks/usePermissions";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { AICoach } from "./pages/AICoach";
import { DatePlanner } from "./pages/DatePlanner";
import MemoryVault from "./pages/MemoryVault";
import { Messages } from "./pages/Messages";
import { Profile } from "./pages/Profile";
import { Games } from "./pages/Games";
import { GameSession } from "./pages/GameSession";
import { CardDeckGame } from "./pages/CardDeckGame";
import { CoupleSetup } from "./pages/CoupleSetup";
import { RelationshipInsights } from "./pages/RelationshipInsights";
import { RelationshipPreferences } from "./pages/RelationshipPreferences";
import { ImportantDates } from "./pages/ImportantDates";
import AppMottoPage from "./pages/AppMotto";
import OnboardingFlow from "./pages/OnboardingFlow";
import EnhancedOnboarding from "./pages/EnhancedOnboarding";
import NotFound from "./pages/NotFound";
import { AppSettings } from "./pages/AppSettings";
import AcceptInvitation from "./pages/AcceptInvitation";
import InviteResolver from "./pages/InviteResolver";
import NewUserInvite from "./pages/NewUserInvite";
import ExistingUserConnect from "./pages/ExistingUserConnect";
import VerificationSuccess from "./pages/VerificationSuccess";
import { Signup } from "./pages/Signup";
import { ResetPassword } from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
import SignupResolver from "./pages/SignupResolver";
import CompleteSignup from "./pages/CompleteSignup";
import { SubscriptionTrial } from "./pages/SubscriptionTrial";
import { SubscriptionPartnerInvite } from "./pages/SubscriptionPartnerInvite";
import { SubscriptionGate } from "./components/SubscriptionGate";

import GooglePlacesTestPage from "./pages/GooglePlacesTest";
import EventScraper from "./pages/EventScraper";
import EventMonitoring from "./pages/EventMonitoring";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { showPermissionsFlow, setShowPermissionsFlow } = usePermissions();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SignupPermissionsFlow 
              isOpen={showPermissionsFlow}
              onComplete={() => setShowPermissionsFlow(false)}
            />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/subscription" element={<Navigate to="/subscription/trial" replace />} />
                <Route path="/subscription/trial" element={<SubscriptionTrial />} />
                <Route path="/subscription/plans" element={<Navigate to="/subscription/trial" replace />} />
                <Route path="/subscription/payment" element={<Navigate to="/subscription/trial" replace />} />
                <Route path="/subscription/partner-invite" element={<SubscriptionPartnerInvite />} />
                <Route path="/dashboard" element={<SubscriptionGate><Dashboard /></SubscriptionGate>} />
                <Route path="/messages" element={<SubscriptionGate><Messages /></SubscriptionGate>} />
                <Route path="/therapy" element={<SubscriptionGate><AICoach /></SubscriptionGate>} />
              <Route path="/dates" element={<SubscriptionGate><DatePlanner /></SubscriptionGate>} />
                <Route path="/games" element={<SubscriptionGate><Games /></SubscriptionGate>} />
                <Route path="/games/:sessionId" element={<SubscriptionGate><GameSession /></SubscriptionGate>} />
                <Route path="/games/card-deck/:sessionId" element={<SubscriptionGate><CardDeckGame /></SubscriptionGate>} />
                <Route path="/games/card-deck/new" element={<SubscriptionGate><CardDeckGame /></SubscriptionGate>} />
                
                
                <Route path="/test-google-places" element={<GooglePlacesTestPage />} />
                <Route path="/event-scraper" element={<EventScraper />} />
                <Route path="/event-monitoring" element={<EventMonitoring />} />
              <Route path="/vault" element={<SubscriptionGate><MemoryVault /></SubscriptionGate>} />
              <Route path="/profile" element={<SubscriptionGate><Profile /></SubscriptionGate>} />
                <Route path="/couple-setup" element={<SubscriptionGate><CoupleSetup /></SubscriptionGate>} />
            <Route path="/preferences" element={<SubscriptionGate><RelationshipPreferences /></SubscriptionGate>} />
            <Route path="/important-dates" element={<SubscriptionGate><ImportantDates /></SubscriptionGate>} />
                <Route path="/insights" element={<SubscriptionGate><RelationshipInsights /></SubscriptionGate>} />
                <Route path="/app-settings" element={<SubscriptionGate><AppSettings /></SubscriptionGate>} />
                <Route path="/motto" element={<AppMottoPage onNext={() => {}} onBack={() => {}} />} />
                <Route path="/onboarding" element={<OnboardingFlow />} />
                <Route path="/enhanced-onboarding" element={<EnhancedOnboarding />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/signup-resolver" element={<SignupResolver />} />
        <Route path="/complete-signup" element={<CompleteSignup />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/invite-resolver" element={<InviteResolver />} />
                <Route path="/verification-success" element={<VerificationSuccess />} />
                <Route path="/new-user-invite" element={<NewUserInvite />} />
                <Route path="/existing-user-connect" element={<ExistingUserConnect />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
