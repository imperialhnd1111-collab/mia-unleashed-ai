import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import CreatorsPage from "./pages/CreatorsPage";
import ContentPage from "./pages/ContentPage";
import CampaignsPage from "./pages/CampaignsPage";
import ChannelPage from "./pages/ChannelPage";
import FansPage from "./pages/FansPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import BotPage from "./pages/BotPage";
import PaymentsPage from "./pages/PaymentsPage";
import PlatformAgentPage from "./pages/PlatformAgentPage";
import CalendarPage from "./pages/CalendarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/auth" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
            <Route path="/" element={<ProtectedRoute session={session}><DashboardPage /></ProtectedRoute>} />
            <Route path="/creators" element={<ProtectedRoute session={session}><CreatorsPage /></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute session={session}><ContentPage /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute session={session}><CampaignsPage /></ProtectedRoute>} />
            <Route path="/channel" element={<ProtectedRoute session={session}><ChannelPage /></ProtectedRoute>} />
            <Route path="/fans" element={<ProtectedRoute session={session}><FansPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute session={session}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute session={session}><PaymentsPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute session={session}><CalendarPage /></ProtectedRoute>} />
            <Route path="/agent" element={<ProtectedRoute session={session}><PlatformAgentPage /></ProtectedRoute>} />
            <Route path="/bot" element={<ProtectedRoute session={session}><BotPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute session={session}><DashboardPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
