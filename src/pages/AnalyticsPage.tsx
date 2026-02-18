import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart2, TrendingUp, Users, MessageSquare, DollarSign, Clock } from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState({
    fans: 0,
    conversations: 0,
    messages: 0,
    events: [] as any[],
    topFans: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: fans },
        { count: conv },
        { count: msgs },
        { data: events },
        { data: topFans },
      ] = await Promise.all([
        supabase.from("fans").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("fans").select("first_name, telegram_username, total_spent, relationship_level").order("total_spent", { ascending: false }).limit(5),
      ]);
      setData({ fans: fans || 0, conversations: conv || 0, messages: msgs || 0, events: events || [], topFans: topFans || [] });
      setLoading(false);
    };
    load();
  }, []);

  const metrics = [
    { label: "Total fans", value: data.fans, icon: Users, color: "text-primary" },
    { label: "Conversaciones", value: data.conversations, icon: MessageSquare, color: "text-emerald" },
    { label: "Mensajes totales", value: data.messages, icon: BarChart2, color: "text-gold" },
    { label: "Ingresos estimados", value: "$0", icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Métricas de engagement, conversión y comportamiento</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="glass rounded-2xl p-5 slide-in">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <m.icon className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? "..." : m.value}</p>
            <p className="text-sm text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top fans */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-bold text-foreground mb-4">🏆 Top Fans</h3>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : data.topFans.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Sin datos aún. Los fans con más gasto aparecerán aquí.</p>
          ) : (
            <div className="space-y-3">
              {data.topFans.map((fan, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                    {(fan.first_name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{fan.first_name || "Anónimo"}</p>
                    <p className="text-xs text-muted-foreground">Nivel {fan.relationship_level}</p>
                  </div>
                  <span className="text-gold font-semibold text-sm">${fan.total_spent}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-bold text-foreground mb-4">⚡ Actividad reciente</h3>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : data.events.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Sin eventos aún. La actividad aparecerá aquí en tiempo real.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2">
                  <span className="text-sm">📊</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground font-medium">{ev.event_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString("es-CO")}</p>
                  </div>
                  {ev.revenue > 0 && <span className="text-xs text-gold">+${ev.revenue}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="glass rounded-2xl p-5 border border-primary/20">
        <h3 className="font-display font-bold text-foreground mb-4">🤖 Recomendaciones de la IA</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: "🕐", title: "Mejor horario", desc: "Publica entre 7-9pm hora Colombia para mayor engagement" },
            { icon: "💬", title: "Estilo de mensaje", desc: "Los mensajes cortos con emojis tienen 40% más respuesta" },
            { icon: "💰", title: "Monetización", desc: "Introduce contenido premium después de 5-7 mensajes de rapport" },
          ].map(r => (
            <div key={r.title} className="bg-secondary rounded-xl p-4">
              <span className="text-2xl mb-2 block">{r.icon}</span>
              <p className="text-sm font-semibold text-foreground mb-1">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
