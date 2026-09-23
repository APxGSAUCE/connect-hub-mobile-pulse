
import * as React from "react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { realtimeService } from "@/services/realtimeService";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PasswordPolicy from "./pages/PasswordPolicy";
import AccessStatus from "./pages/AccessStatus";
import NotFound from "./pages/NotFound";

const LegacyPortalRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
};

// Cleanup realtime subscriptions on app unmount
const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    return () => {
      realtimeService.cleanup();
    };
  }, []);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWrapper>
          <TooltipProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/password-policy" element={<PasswordPolicy />} />
              <Route path="/access-status" element={<AccessStatus />} />
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/messages" element={<Index />} />
              <Route path="/events" element={<Index />} />
              <Route path="/employees" element={<Index />} />
              <Route path="/admin" element={<Index />} />
              <Route path="/profile" element={<Index />} />
              <Route path="/home" element={<LegacyPortalRedirect to="/" />} />
              <Route path="/chat" element={<LegacyPortalRedirect to="/messages" />} />
              <Route path="/calendar" element={<LegacyPortalRedirect to="/events" />} />
              <Route path="/team" element={<LegacyPortalRedirect to="/employees" />} />
              <Route path="/directory" element={<LegacyPortalRedirect to="/employees" />} />
              <Route path="/account" element={<LegacyPortalRedirect to="/profile" />} />
              <Route path="/settings" element={<LegacyPortalRedirect to="/profile" />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AppWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
