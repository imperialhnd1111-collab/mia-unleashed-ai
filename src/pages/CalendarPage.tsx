import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Brain, Instagram, Radio, Hash, Music, Calendar, Crown, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pushNotification } from "@/hooks/use-notifications";
import CalendarGrid, { type CalendarEvent } from "@/components/CalendarGrid";
import CalendarExport from "@/components/CalendarExport";
import ContentPlanStrategy from "@/components/ContentPlanStrategy";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "tiktok", label: "TikTok", icon: Music },
  { id: "x", label: "X (Twitter)", icon: Hash },
  { id: "telegram_vip", label: "Telegram VIP", icon: Radio },
];

export default function CalendarPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [aiPlan, setAiPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => { loadCreators(); }, []);

  const loadCreators = async () => {
    const { data } = await supabase.from("creators").select("id, name, username, avatar_url").eq("status", "active");
    setCreators(data || []);
    if (data && data.length > 0) setSelectedCreator(data[0].id);
    setLoadingCreators(false);
  };

  const generateContentPlan = async () => {
    if (!selectedCreator) return;
    setLoading(true);
    setAiPlan("");
    setEvents([]);
    try {
      const { data, error } = await supabase.functions.invoke("content-manager", {
        body: { creator_id: selectedCreator, month, year },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiPlan(data?.plan || "");
      setEvents(data?.events || []);
      
      const creator = creators.find(c => c.id === selectedCreator);
      pushNotification({
        type: "content",
        title: "Plan de contenido generado",
        message: `${data?.events?.length || 0} publicaciones creadas para ${creator?.name || "creadora"} — ${new Date(year, month - 1).toLocaleDateString("es-CO", { month: "long" })}`,
      });
      toast.success("📅 Plan de contenido generado");
    } catch (e: any) {
      toast.error(e.message || "Error generando plan");
    }
    setLoading(false);
  };

  const creator = creators.find(c => c.id === selectedCreator);
  const totalPremium = events.filter(e => e.is_premium).length;
  const totalPacks = events.filter(e => e.type === "pack").length;
  const activePlatforms = [...new Set(events.map(e => e.platform))].length;

  if (loadingCreators) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">📅 Calendario de Contenido</h1>
          <p className="text-muted-foreground mt-1 text-sm">Plan estratégico por creadora y plataforma — gestionado por IA</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarExport events={events} creatorName={creator?.name || ""} month={month} year={year} />
          <Button onClick={generateContentPlan} disabled={loading || !selectedCreator} className="gradient-primary text-primary-foreground glow-rose">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando...</> : <><Brain className="w-4 h-4 mr-2" />Generar plan IA</>}
          </Button>
        </div>
      </div>

      {/* Creator selector */}
      <Select value={selectedCreator} onValueChange={setSelectedCreator}>
        <SelectTrigger className="w-[220px] bg-muted border-border">
          <SelectValue placeholder="Selecciona creadora" />
        </SelectTrigger>
        <SelectContent>
          {creators.map(c => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex items-center gap-2">
                {c.avatar_url && <img src={c.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />}
                <span>{c.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Stats bar */}
      {events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Calendar, label: "Total posts", value: events.length, color: "text-primary" },
            { icon: Crown, label: "Premium", value: totalPremium, color: "text-[hsl(var(--gold))]" },
            { icon: Sparkles, label: "Packs", value: totalPacks, color: "text-purple-400" },
            { icon: TrendingUp, label: "Plataformas", value: activePlatforms, color: "text-[hsl(var(--emerald))]" },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-xl p-3 text-center">
              <stat.icon className={cn("w-5 h-5 mx-auto mb-1.5", stat.color)} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="glass rounded-2xl p-4 border border-border lg:col-span-2">
          <CalendarGrid events={events} month={month} year={year} onMonthChange={(m, y) => { setMonth(m); setYear(y); }} />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Platform breakdown */}
          {events.length > 0 && (
            <div className="glass rounded-2xl p-4 border border-border">
              <h4 className="font-display font-bold text-foreground text-sm mb-3">📊 Por plataforma</h4>
              <div className="space-y-2">
                {PLATFORMS.map(p => {
                  const count = events.filter(e => e.platform === p.id).length;
                  const pct = events.length > 0 ? (count / events.length) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <p.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground font-medium">{p.label}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Strategy */}
          {aiPlan && <ContentPlanStrategy plan={aiPlan} />}
        </div>
      </div>

      {/* Empty state */}
      {!aiPlan && events.length === 0 && (
        <div className="glass rounded-2xl p-8 border border-border text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
          <h3 className="font-display font-bold text-foreground mb-2">Manager IA de Contenido</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Selecciona una creadora y presiona <strong>Generar plan IA</strong> para crear un calendario visual con tarjetas interactivas.
          </p>
        </div>
      )}
    </div>
  );
}
