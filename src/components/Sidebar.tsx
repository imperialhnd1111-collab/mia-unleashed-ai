import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Image, Megaphone, BarChart3,
  Bot, Settings, LogOut, ChevronLeft, ChevronRight, Sparkles, Radio
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import miaAvatar from "@/assets/mia-avatar.jpg";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/creators", icon: Sparkles, label: "Creadoras" },
  { to: "/content", icon: Image, label: "Contenido" },
  { to: "/campaigns", icon: Megaphone, label: "Campañas" },
  { to: "/channel", icon: Radio, label: "Canal" },
  { to: "/fans", icon: Users, label: "Fans" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/bot", icon: Bot, label: "Bot AI" },
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out border-r border-border scrollbar-thin overflow-y-auto",
        "bg-background",
        collapsed ? "w-16" : "w-56"
      )}
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border", collapsed && "justify-center px-2")}>
        <div className="relative flex-shrink-0">
          <img src={miaAvatar} alt="Creator AI" className="w-8 h-8 rounded-full object-cover border border-primary" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full status-active border border-sidebar" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Creator AI</p>
            <p className="text-xs text-muted-foreground">Panel Admin</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-14 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10 shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                active
                  ? "gradient-primary text-white glow-rose shadow-rose"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Salir" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
