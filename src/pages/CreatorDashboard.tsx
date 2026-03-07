import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bot, LogOut, Sparkles, Settings, CreditCard, Users, User, LayoutDashboard, ChevronRight } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import CreatorOnboarding from "@/components/creator/CreatorOnboarding";
import CreatorStats from "@/components/creator/CreatorStats";
import CreatorBotConfig from "@/components/creator/CreatorBotConfig";
import CreatorPricing from "@/components/creator/CreatorPricing";
import CreatorProfile from "@/components/creator/CreatorProfile";

type Tab = "dashboard" | "bot" | "pricing" | "profile";

export default function CreatorDashboard({ session }: { session: Session }) {
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  useEffect(() => {
    loadCreator();
  }, [session]);

  const loadCreator = async () => {
    const { data: p } = await supabase.from("profiles").select("creator_id").eq("id", session.user.id).single();
    if (p?.creator_id) {
      const { data: c } = await supabase.from("creators").select("*").eq("id", p.creator_id).single();
      setCreator(c);
    }
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!creator) {
    return <CreatorOnboarding session={session} onCreated={loadCreator} onLogout={handleLogout} />;
  }

  const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: "dashboard", label: "Panel", icon: LayoutDashboard, color: "text-primary" },
    { id: "bot", label: "Bot & IA", icon: Bot, color: "text-emerald-400" },
    { id: "pricing", label: "Precios", icon: CreditCard, color: "text-amber-400" },
    { id: "profile", label: "Perfil", icon: User, color: "text-violet-400" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border/40 px-4 py-3 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          {creator.avatar_url ? (
            <img src={creator.avatar_url} className="w-8 h-8 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
              {creator.name?.charAt(0)}
            </div>
          )}
          <div>
            <span className="font-display font-bold text-sm">{creator.name}</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400">IA activa</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
      </nav>

      {/* Tab Bar */}
      <div className="border-b border-border/40 px-4 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ""}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <CreatorStats creator={creator} />

            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Acciones rápidas</h3>
              {[
                { icon: Bot, label: "Configurar Bot y IA", desc: "Conecta tu bot y personaliza tu clon", tab: "bot" as Tab, color: "text-emerald-400" },
                { icon: CreditCard, label: "Precios y Suscripciones", desc: "Configura planes y regalos", tab: "pricing" as Tab, color: "text-amber-400" },
                { icon: User, label: "Editar Perfil", desc: "Nombre, bio, avatar y más", tab: "profile" as Tab, color: "text-violet-400" },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(action.tab)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "bot" && <CreatorBotConfig creator={creator} onUpdate={loadCreator} />}
        {activeTab === "pricing" && <CreatorPricing creator={creator} onUpdate={loadCreator} />}
        {activeTab === "profile" && <CreatorProfile creator={creator} onUpdate={loadCreator} />}
      </div>
    </div>
  );
}
