import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart2, TrendingUp, Users, MessageSquare, DollarSign, Clock, Brain, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function AnalyticsPage() {
  const [data, setData] = useState({ fans: 0, conversations: 0, messages: 0, events: [] as any[], topFans: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ count: fans }, { count: conv }, { count: msgs }, { data: events }, { data: topFans }, { data: creatorsData }] = await Promise.all([
        supabase.from("fans").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("fans").select("first_name, telegram_username, total_spent, relationship_level").order("total_spent", { ascending: false }).limit(5),
        supabase.from("creators").select("id, name").order("created_at"),
      ]);
      setData({ fans: fans || 0, conversations: conv || 0, messages: msgs || 0, events: events || [], topFans: topFans || [] });
      setCreators(creatorsData || []);
      setLoading(false);
    };
    load();
  }, []);

  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const { data: result, error } = await supabase.functions.invoke("analytics-ai", {
        body: { creator_id: selectedCreator === "all" ? null : selectedCreator },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setAiAnalysis(result.analysis || "Sin resultados");
    } catch (e: any) {
      toast.error(e.message || "Error al analizar");
    }
    setAiLoading(false);
  };

  const metrics = [
    { label: "Total fans", value: data.fans, icon: Users },
    { label: "Conversaciones", value: data.conversations, icon: MessageSquare },
    { label: "Mensajes", value: data.messages, icon: BarChart2 },
    { label: "Ingresos", value: "$0", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Métricas de engagement y comportamiento</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="glass rounded-2xl p-4 slide-in">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center"><m.icon className="w-4 h-4 text-white" /></div>
              <TrendingUp className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-xl font-bold text-foreground">{loading ? "..." : m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* AI Super Agent */}
      <div className="glass rounded-2xl p-4 md:p-6 border border-primary/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">🧠 Super Agente IA</h3>
              <p className="text-xs text-muted-foreground">Analiza conversaciones y sugiere estrategias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger className="bg-muted border-border w-40">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📊 Todas</SelectItem>
                {creators.map(c => (
                  <SelectItem key={c.id} value={c.id}>👩 {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runAiAnalysis} disabled={aiLoading} className="gradient-primary text-white glow-rose">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-1 hidden sm:inline">{aiLoading ? "Analizando..." : "Analizar"}</span>
            </Button>
          </div>
        </div>

        {aiAnalysis ? (
          <div className="bg-secondary rounded-xl p-4 prose prose-sm prose-invert max-w-none text-foreground">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">Presiona "Analizar" para obtener insights de IA</p>
            <p className="text-xs text-muted-foreground mt-1">Puedes filtrar por creadora individual o analizar toda la agencia</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <h3 className="font-display font-bold text-foreground mb-4">🏆 Top Fans</h3>
          {loading ? <p className="text-muted-foreground text-sm">Cargando...</p> : data.topFans.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data.topFans.map((fan, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">{(fan.first_name || "?")[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{fan.first_name || "Anónimo"}</p>
                    <p className="text-xs text-muted-foreground">Lv {fan.relationship_level}</p>
                  </div>
                  <span className="text-gold font-semibold text-sm">${fan.total_spent}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="font-display font-bold text-foreground mb-4">⚡ Actividad</h3>
          {loading ? <p className="text-muted-foreground text-sm">Cargando...</p> : data.events.length === 0 ? (
            <div className="text-center py-6"><Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground text-sm">Sin eventos</p></div>
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
    </div>
  );
}
