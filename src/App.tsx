import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import { SignupPermissionsFlow } from "./components/SignupPermissionsFlow";
import { usePermissions } from "./hooks/usePermissions";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { AICoach } from "./pages/AICoach";
import { DatePlanner } from "./pages/DatePlanner";
import { MemoryVault } from "./pages/MemoryVault";
import { Messages } from "./pages/Messages";
import { Profile } from "./pages/Profile";
import { CoupleSetup } from "./pages/CoupleSetup";
import { RelationshipInsights } from "./pages/RelationshipInsights";
import { RelationshipPreferences } from "./pages/RelationshipPreferences";
import { ImportantDates } from "./pages/ImportantDates";
import AppMottoPage from "./pages/AppMotto";
import OnboardingFlow from "./pages/OnboardingFlow";
import NotFound from "./pages/NotFound";
import { AppSettings } from "./pages/AppSettings";

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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/coach" element={<AICoach />} />
                <Route path="/planner" element={<DatePlanner />} />
                <Route path="/vault" element={<MemoryVault />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/couple-setup" element={<CoupleSetup />} />
            <Route path="/preferences" element={<RelationshipPreferences />} />
            <Route path="/important-dates" element={<ImportantDates />} />
                <Route path="/insights" element={<RelationshipInsights />} />
                <Route path="/app-settings" element={<AppSettings />} />
                <Route path="/motto" element={<AppMottoPage onNext={() => {}} onBack={() => {}} />} />
                <Route path="/onboarding" element={<OnboardingFlow />} />
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
