import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { AICoach } from "./pages/AICoach";
import { DatePlanner } from "./pages/DatePlanner";
import { MemoryVault } from "./pages/MemoryVault";
import { Profile } from "./pages/Profile";
import { CoupleSetup } from "./pages/CoupleSetup";
import { RelationshipInsights } from "./pages/RelationshipInsights";
import AppMottoPage from "./pages/AppMotto";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/coach" element={<AICoach />} />
              <Route path="/planner" element={<DatePlanner />} />
              <Route path="/vault" element={<MemoryVault />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/couple-setup" element={<CoupleSetup />} />
              <Route path="/insights" element={<RelationshipInsights />} />
              <Route path="/motto" element={<AppMottoPage onNext={() => window.location.href = '/auth'} onBack={() => window.location.href = '/'} />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
