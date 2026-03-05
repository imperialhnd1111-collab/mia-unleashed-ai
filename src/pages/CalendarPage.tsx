import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Brain, Sparkles, Instagram, Radio, Hash, Plus, Image, Video, FileText, Music } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ContentPlanDisplay from "@/components/ContentPlanDisplay";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { id: "tiktok", label: "TikTok", icon: Music, color: "bg-gradient-to-br from-cyan-400 to-pink-500" },
  { id: "x", label: "X (Twitter)", icon: Hash, color: "bg-foreground" },
  { id: "telegram_vip", label: "Telegram VIP", icon: Radio, color: "bg-gradient-to-br from-blue-400 to-blue-600" },
];

const contentTypeIcons: Record<string, { icon: any; label: string; cls: string }> = {
  photo: { icon: Image, label: "Foto", cls: "bg-blue-500/20 text-blue-400" },
  video: { icon: Video, label: "Video", cls: "bg-purple-500/20 text-purple-400" },
  text: { icon: FileText, label: "Texto", cls: "bg-emerald/20 text-emerald" },
  pack: { icon: Sparkles, label: "Pack", cls: "bg-gold/20 text-gold" },
};

interface CalendarEvent {
  date: string;
  platform: string;
  type: string;
  title: string;
  description: string;
  time?: string;
  is_premium?: boolean;
}

export default function CalendarPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [aiPlan, setAiPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => {
    loadCreators();
  }, []);

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
        body: { creator_id: selectedCreator, month: selectedDate ? selectedDate.getMonth() + 1 : new Date().getMonth() + 1, year: selectedDate ? selectedDate.getFullYear() : new Date().getFullYear() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiPlan(data?.plan || "");
      setEvents(data?.events || []);
      toast.success("📅 Plan de contenido generado");
    } catch (e: any) {
      toast.error(e.message || "Error generando plan");
    }
    setLoading(false);
  };

  const filteredEvents = events.filter(e => {
    if (selectedPlatform !== "all" && e.platform !== selectedPlatform) return false;
    if (selectedDate) {
      const eventDate = new Date(e.date);
      return eventDate.toDateString() === selectedDate.toDateString();
    }
    return true;
  });

  const eventDates = events.map(e => new Date(e.date));

  const creator = creators.find(c => c.id === selectedCreator);

  if (loadingCreators) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">📅 Calendario de Contenido</h1>
          <p className="text-muted-foreground mt-1 text-sm">Plan estratégico por creadora y plataforma — gestionado por IA</p>
        </div>
        <Button onClick={generateContentPlan} disabled={loading || !selectedCreator} className="gradient-primary text-primary-foreground glow-rose">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando...</> : <><Brain className="w-4 h-4 mr-2" />Generar plan IA</>}
        </Button>
      </div>

      {/* Creator selector */}
      <div className="flex flex-wrap gap-3 items-center">
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

        {/* Platform filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPlatform("all")}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", selectedPlatform === "all" ? "gradient-primary text-primary-foreground glow-rose" : "bg-muted text-muted-foreground hover:text-foreground")}
          >
            Todas
          </button>
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5", selectedPlatform === p.id ? "gradient-primary text-primary-foreground glow-rose" : "bg-muted text-muted-foreground hover:text-foreground")}
            >
              <p.icon className="w-3 h-3" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="glass rounded-2xl p-4 border border-border lg:col-span-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className={cn("p-3 pointer-events-auto")}
            modifiers={{ hasEvent: eventDates }}
            modifiersClassNames={{ hasEvent: "bg-primary/20 text-primary font-bold" }}
          />

          {/* Quick stats */}
          {events.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => {
                const count = events.filter(e => e.platform === p.id).length;
                return (
                  <div key={p.id} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <p className="text-[10px] text-muted-foreground">{p.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day events */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDate && (
            <div className="glass rounded-2xl p-5 border border-border">
              <h3 className="font-display font-bold text-foreground mb-4">
                📋 {selectedDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                {creator && <span className="text-muted-foreground text-sm font-normal ml-2">— {creator.name}</span>}
              </h3>

              {filteredEvents.length > 0 ? (
                <div className="space-y-3">
                  {filteredEvents.map((event, i) => {
                    const platform = PLATFORMS.find(p => p.id === event.platform);
                    const cType = contentTypeIcons[event.type] || contentTypeIcons.text;
                    const CIcon = cType.icon;
                    return (
                      <div key={i} className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all slide-in" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-start gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", platform?.color || "bg-muted")}>
                            {platform && <platform.icon className="w-5 h-5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cType.cls)}>
                                <CIcon className="w-3 h-3 inline mr-1" />{cType.label}
                              </span>
                              {event.is_premium && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-medium">👑 Premium</span>
                              )}
                              {event.time && (
                                <span className="text-[10px] text-muted-foreground">🕐 {event.time}</span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    {events.length === 0 ? "Genera un plan con IA para ver eventos" : "Sin contenido programado para este día"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Plan - New visual display */}
          {(aiPlan || events.length > 0) && (
            <ContentPlanDisplay plan={aiPlan} events={events} />
          )}

          {/* Empty state */}
          {!aiPlan && events.length === 0 && (
            <div className="glass rounded-2xl p-8 border border-border text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
              <h3 className="font-display font-bold text-foreground mb-2">Manager IA de Contenido</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Selecciona una creadora y presiona <strong>Generar plan IA</strong> para crear un calendario de contenido personalizado para Instagram, TikTok, X y Telegram.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
