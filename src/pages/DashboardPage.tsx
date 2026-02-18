import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, DollarSign, MessageSquare, Zap, Heart, Activity, BarChart2 } from "lucide-react";
import miaAvatar from "@/assets/mia-avatar.jpg";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, sub, color = "primary" }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 slide-in">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center gradient-primary`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs text-emerald bg-emerald/10 px-2 py-0.5 rounded-full">+12%</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [fans, setFans] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: c }, { count: f }] = await Promise.all([
        supabase.from("creators").select("*").limit(10),
        supabase.from("fans").select("*", { count: "exact", head: true }),
      ]);
      setCreators(c || []);
      setFans(f || 0);
      setLoading(false);
    };
    load();
  }, []);

  const stats = [
    { icon: Zap, label: "Creadoras activas", value: creators.filter(c => c.status === "active").length.toString() || "0", sub: "AI en línea" },
    { icon: Users, label: "Total fans", value: fans.toString(), sub: "Suscriptores Telegram" },
    { icon: DollarSign, label: "Ingresos (30d)", value: "$0", sub: "Nequi · PSE · Crypto" },
    { icon: MessageSquare, label: "Mensajes enviados", value: "0", sub: "Conversaciones activas" },
    { icon: Heart, label: "Propinas recibidas", value: "$0", sub: "Tips de fans" },
    { icon: TrendingUp, label: "Conversión", value: "0%", sub: "De mensaje a compra" },
    { icon: Activity, label: "Campañas activas", value: "0", sub: "Broadcasts" },
    { icon: BarChart2, label: "Engagement", value: "0%", sub: "Respuesta media" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visión general de tu plataforma Creator AI</p>
        </div>
        <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full status-active pulse-rose" />
          <span className="text-sm text-foreground">Sistema activo</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Creators section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-foreground">Creadoras</h2>
          <a href="/creators" className="text-sm text-primary hover:underline">Ver todas →</a>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">Cargando...</div>
        ) : creators.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <img src={miaAvatar} alt="Mia" className="w-20 h-20 rounded-full object-cover border-2 border-primary glow-rose" />
              <span className="absolute -bottom-1 -right-1 text-lg">✨</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Crea tu primera creadora</h3>
            <p className="text-muted-foreground text-sm mb-4">Dale vida a Mia Battu y más modelos AI en tu plataforma</p>
            <a href="/creators" className="inline-flex items-center gap-2 gradient-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium glow-rose hover:opacity-90 transition-opacity">
              <Zap className="w-4 h-4" /> Crear creadora
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creators.map((creator) => (
              <div key={creator.id} className="glass rounded-2xl p-5 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={creator.avatar_url || miaAvatar}
                    alt={creator.name}
                    className="w-12 h-12 rounded-full object-cover border border-primary"
                  />
                  <div>
                    <p className="font-semibold text-foreground">{creator.name}</p>
                    <p className="text-xs text-muted-foreground">@{creator.username}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`w-2 h-2 rounded-full block ${creator.status === "active" ? "status-active" : "status-inactive"}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>IA: {creator.ai_enabled ? "🟢 Activa" : "🔴 Pausada"}</span>
                  <span>{creator.language?.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Nueva campaña", icon: "📣", href: "/campaigns" },
            { label: "Subir contenido", icon: "📸", href: "/content" },
            { label: "Programar post", icon: "📅", href: "/channel" },
            { label: "Ver conversaciones", icon: "💬", href: "/fans" },
          ].map((a) => (
            <a key={a.href} href={a.href} className="glass rounded-xl p-4 text-center hover:border-primary/40 transition-colors cursor-pointer group">
              <span className="text-2xl mb-2 block">{a.icon}</span>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{a.label}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
