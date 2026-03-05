import { ReactNode, useState } from "react";
import Sidebar, { MobileMenuButton } from "./Sidebar";
import NotificationCenter from "./NotificationCenter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="min-h-full p-4 md:p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isMobile && <MobileMenuButton onClick={() => setMobileOpen(true)} />}
              {isMobile && <h2 className="text-lg font-display font-bold text-foreground">Creator AI</h2>}
            </div>
            <NotificationCenter />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
