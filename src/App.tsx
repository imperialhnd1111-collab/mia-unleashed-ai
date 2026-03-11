import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingState } from "@/components/shared";
import DashboardLayout from "./components/DashboardLayout";
import InstallPrompt from "./components/InstallPrompt";

// Lazy-loaded pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CreatorsPage = lazy(() => import("./pages/CreatorsPage"));
const ContentPage = lazy(() => import("./pages/ContentPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const ChannelPage = lazy(() => import("./pages/ChannelPage"));
const FansPage = lazy(() => import("./pages/FansPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const BotPage = lazy(() => import("./pages/BotPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const PlatformAgentPage = lazy(() => import("./pages/PlatformAgentPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setStandalone(isStandalone);
  }, []);
  return standalone;
}

function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "creator" | null>(null);

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (data && data.length > 0) {
        const roles = data.map((r: { role: string }) => r.role);
        setUserRole(roles.includes("admin") ? "admin" : "creator");
      } else {
        setUserRole("admin");
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else { setUserRole(null); setLoading(false); }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, userRole };
}

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/auth" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

// Admin route definitions to reduce repetition
const adminRoutes = [
  { path: "/creators", element: CreatorsPage },
  { path: "/content", element: ContentPage },
  { path: "/campaigns", element: CampaignsPage },
  { path: "/channel", element: ChannelPage },
  { path: "/fans", element: FansPage },
  { path: "/analytics", element: AnalyticsPage },
  { path: "/payments", element: PaymentsPage },
  { path: "/calendar", element: CalendarPage },
  { path: "/agent", element: PlatformAgentPage },
  { path: "/bot", element: BotPage },
  { path: "/monitoring", element: MonitoringPage },
  { path: "/settings", element: DashboardPage },
] as const;

const App = () => {
  const { session, loading, userRole } = useAuth();
  const isMobile = useIsMobile();
  const isStandalone = useIsStandalone();

  if (loading) return <SuspenseFallback />;

  if (isMobile && !isStandalone && session && userRole === "admin") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/landing" element={session ? <Navigate to="/" replace /> : <LandingPage />} />
              <Route path="/register" element={session ? <Navigate to="/" replace /> : <RegisterPage />} />
              <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />

              {/* Root */}
              <Route path="/" element={
                !session ? <Navigate to="/landing" replace /> :
                userRole === "admin" ? <ProtectedRoute session={session}><DashboardPage /></ProtectedRoute> :
                <CreatorDashboard session={session} />
              } />

              {/* Admin routes */}
              {adminRoutes.map(({ path, element: Element }) => (
                <Route key={path} path={path} element={
                  <ProtectedRoute session={session}><Element /></ProtectedRoute>
                } />
              ))}

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
