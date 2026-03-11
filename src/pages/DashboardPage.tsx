import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, MessageSquare, Zap, Heart, Activity, BarChart2, TrendingUp } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import miaAvatar from "@/assets/mia-avatar.jpg";

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  status: string;
  ai_enabled: boolean;
  language: string | null;
}

interface DashboardData {
  creators: Creator[];
  fansCount: number;
}

export default function DashboardPage() {
  const { data, loading } = useSupabaseQuery<DashboardData>(
    { creators: [], fansCount: 0 },
    async () => {
      const [{ data: c }, { count: f }] = await Promise.all([
        supabase.from("creators").select("*").limit(10),
        supabase.from("fans").select("*", { count: "exact", head: true }),
      ]);
      return { creators: (c || []) as Creator[], fansCount: f || 0 };
    }
  );

  const stats = [
    { icon: Zap, label: "Creadoras activas", value: data.creators.filter(c => c.status === "active").length.toString(), sub: "AI en línea" },
    { icon: Users, label: "Total fans", value: data.fansCount.toString(), sub: "Suscriptores Telegram" },
    { icon: DollarSign, label: "Ingresos (30d)", value: "$0", sub: "Nequi · PSE · Crypto" },
    { icon: MessageSquare, label: "Mensajes enviados", value: "0", sub: "Conversaciones activas" },
    { icon: Heart, label: "Propinas recibidas", value: "$0", sub: "Tips de fans" },
    { icon: TrendingUp, label: "Conversión", value: "0%", sub: "De mensaje a compra" },
    { icon: Activity, label: "Campañas activas", value: "0", sub: "Broadcasts" },
    { icon: BarChart2, label: "Engagement", value: "0%", sub: "Respuesta media" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Dashboard" description="Visión general de tu plataforma Creator AI" />
        <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full status-active pulse-rose" />
          <span className="text-sm text-foreground">Sistema activo</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} trend="+12%" />)}
      </div>

      {/* Creators section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-foreground">Creadoras</h2>
          <a href="/creators" className="text-sm text-primary hover:underline">Ver todas →</a>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">Cargando...</div>
        ) : data.creators.length === 0 ? (
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
            {data.creators.map((creator) => (
              <div key={creator.id} className="glass rounded-2xl p-5 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <img src={creator.avatar_url || miaAvatar} alt={creator.name} className="w-12 h-12 rounded-full object-cover border border-primary" />
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
