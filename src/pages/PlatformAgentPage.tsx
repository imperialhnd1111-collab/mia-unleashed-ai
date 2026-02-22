import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Loader2, RefreshCw, CheckCircle, XCircle, Clock, Zap, TrendingUp, Megaphone, CreditCard, Settings, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const categoryIcons: Record<string, { icon: any; emoji: string; color: string }> = {
  content: { icon: TrendingUp, emoji: "📝", color: "text-blue-400" },
  campaign: { icon: Megaphone, emoji: "📣", color: "text-purple-400" },
  payment: { icon: CreditCard, emoji: "💰", color: "text-emerald" },
  platform: { icon: Settings, emoji: "🔧", color: "text-gold" },
  agent: { icon: Bot, emoji: "🤖", color: "text-primary" },
};

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: "Pendiente", icon: Clock, cls: "text-gold bg-gold/10" },
  approved: { label: "Aprobada", icon: CheckCircle, cls: "text-emerald bg-emerald/10" },
  rejected: { label: "Rechazada", icon: XCircle, cls: "text-destructive bg-destructive/10" },
  implemented: { label: "Implementada", icon: Zap, cls: "text-primary bg-primary/10" },
};

export default function PlatformAgentPage() {
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    const { data } = await supabase.from("agent_suggestions").select("*").order("created_at", { ascending: false }).limit(30);
    setSuggestions(data || []);
    setLoadingSuggestions(false);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("platform-agent", {
        body: { action: "analyze" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary || "Análisis completado");
      await loadSuggestions();
    } catch (e: any) {
      toast.error(e.message || "Error al analizar");
    }
    setLoading(false);
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActing(id);
    try {
      const { error } = await supabase.functions.invoke("platform-agent", {
        body: { action, suggestion_id: id },
      });
      if (error) throw error;
      toast.success(action === "approve" ? "✅ Sugerencia aprobada" : "❌ Sugerencia rechazada");
      await loadSuggestions();
    } catch (e: any) {
      toast.error(e.message);
    }
    setActing(null);
  };

  const pending = suggestions.filter(s => s.status === "pending");
  const history = suggestions.filter(s => s.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">🧠 Super Agente IA</h1>
          <p className="text-muted-foreground mt-1 text-sm">Analiza toda la plataforma y sugiere mejoras accionables</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gradient-primary text-white glow-rose">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analizando...</> : <><RefreshCw className="w-4 h-4 mr-2" />Analizar plataforma</>}
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="glass rounded-2xl p-5 border border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">📊 Resumen Ejecutivo</h3>
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-foreground/90">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Pending Suggestions */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold text-foreground">⏳ Sugerencias pendientes ({pending.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pending.map(s => {
              const cat = categoryIcons[s.category] || categoryIcons.platform;
              const impact = (s.action_data as any)?.impact;
              return (
                <div key={s.id} className="glass rounded-2xl p-4 border border-gold/30 slide-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <cat.icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{cat.emoji} {s.category}</span>
                        {impact && <span className={`text-xs px-2 py-0.5 rounded-full ${impact === "alto" ? "bg-destructive/10 text-destructive" : impact === "medio" ? "bg-gold/10 text-gold" : "bg-muted text-muted-foreground"}`}>📈 {impact}</span>}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{s.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => handleAction(s.id, "approve")} disabled={acting === s.id} className="gradient-primary text-white text-xs h-7">
                          <CheckCircle className="w-3 h-3 mr-1" /> Aprobar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction(s.id, "reject")} disabled={acting === s.id} className="border-border text-xs h-7">
                          <XCircle className="w-3 h-3 mr-1" /> Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold text-foreground">📜 Historial</h2>
          <div className="space-y-2">
            {history.map(s => {
              const st = statusConfig[s.status] || statusConfig.pending;
              const cat = categoryIcons[s.category] || categoryIcons.platform;
              return (
                <div key={s.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${st.cls}`}>
                    <st.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{cat.emoji} {s.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("es-CO")}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !summary && pending.length === 0 && history.length === 0 && (
        <div className="text-center py-16">
          <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">Super Agente IA listo</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Presiona <strong>Analizar plataforma</strong> para que el agente evalúe todas las secciones, modelos, pagos y estadísticas, y genere sugerencias que puedes aprobar o rechazar.</p>
        </div>
      )}
    </div>
  );
}
