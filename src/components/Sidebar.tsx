import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Image, Megaphone, BarChart3,
  Bot, Settings, LogOut, ChevronLeft, ChevronRight, Sparkles, Radio, Menu, X,
  CreditCard, Brain
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import miaAvatar from "@/assets/mia-avatar.jpg";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/creators", icon: Sparkles, label: "Creadoras" },
  { to: "/content", icon: Image, label: "Contenido" },
  { to: "/campaigns", icon: Megaphone, label: "Campañas" },
  { to: "/channel", icon: Radio, label: "Canal" },
  { to: "/fans", icon: Users, label: "Fans" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/payments", icon: CreditCard, label: "Pagos" },
  { to: "/agent", icon: Brain, label: "Agente IA" },
  { to: "/bot", icon: Bot, label: "Bot AI" },
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
  };

  const closeMobile = () => setMobileOpen?.(false);

  const sidebarContent = (
    <aside
      className={cn(
        "flex flex-col h-screen transition-all duration-300 ease-in-out border-r border-border scrollbar-thin overflow-y-auto bg-background",
        isMobile ? "w-64" : collapsed ? "w-16" : "w-56"
      )}
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border", !isMobile && collapsed && "justify-center px-2")}>
        <div className="relative flex-shrink-0">
          <img src={miaAvatar} alt="Creator AI" className="w-8 h-8 rounded-full object-cover border border-primary" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full status-active border border-sidebar" />
        </div>
        {(isMobile || !collapsed) && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">Creator AI</p>
            <p className="text-xs text-muted-foreground">Panel Admin</p>
          </div>
        )}
        {isMobile && (
          <button onClick={closeMobile} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10 shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                !isMobile && collapsed && "justify-center px-2",
                active
                  ? "gradient-primary text-white glow-rose shadow-rose"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
              title={!isMobile && collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {(isMobile || !collapsed) && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-2 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full",
            !isMobile && collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(isMobile || !collapsed) && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeMobile} />
        )}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </div>
      </>
    );
  }

  return <div className="sticky top-0 relative">{sidebarContent}</div>;
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="md:hidden p-2 rounded-lg hover:bg-secondary text-foreground">
      <Menu className="w-5 h-5" />
    </button>
  );
}
