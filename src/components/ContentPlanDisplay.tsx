import { useState } from "react";
import { Brain, Instagram, Music, Hash, Radio, Image, Video, FileText, Sparkles, ChevronDown, ChevronUp, Calendar, Clock, Crown, TrendingUp, Target, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const PLATFORMS: Record<string, { label: string; icon: any; gradient: string; border: string }> = {
  instagram: { label: "Instagram", icon: Instagram, gradient: "from-purple-500 to-pink-500", border: "border-purple-500/30" },
  tiktok: { label: "TikTok", icon: Music, gradient: "from-cyan-400 to-pink-500", border: "border-cyan-400/30" },
  x: { label: "X (Twitter)", icon: Hash, gradient: "from-gray-400 to-gray-600", border: "border-gray-400/30" },
  telegram_vip: { label: "Telegram VIP", icon: Radio, gradient: "from-blue-400 to-blue-600", border: "border-blue-400/30" },
};

const TYPE_CONFIG: Record<string, { icon: any; label: string; gradient: string }> = {
  photo: { icon: Image, label: "Foto", gradient: "from-blue-500/20 to-blue-400/10" },
  video: { icon: Video, label: "Video", gradient: "from-purple-500/20 to-purple-400/10" },
  text: { icon: FileText, label: "Texto", gradient: "from-emerald-500/20 to-emerald-400/10" },
  pack: { icon: Sparkles, label: "Pack", gradient: "from-amber-500/20 to-yellow-400/10" },
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

interface Props {
  plan: string;
  events: CalendarEvent[];
}

export default function ContentPlanDisplay({ plan, events }: Props) {
  const [expandedStrategy, setExpandedStrategy] = useState(true);
  const [viewMode, setViewMode] = useState<"platform" | "week">("platform");

  // Group events by platform
  const byPlatform = Object.keys(PLATFORMS).map(pid => ({
    ...PLATFORMS[pid],
    id: pid,
    events: events.filter(e => e.platform === pid),
  }));

  // Group events by week
  const byWeek: { label: string; events: CalendarEvent[] }[] = [];
  if (events.length > 0) {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    let weekNum = 1;
    let weekStart = new Date(sorted[0].date);
    let currentWeek: CalendarEvent[] = [];

    sorted.forEach(ev => {
      const d = new Date(ev.date);
      const diff = (d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 7) {
        byWeek.push({ label: `Semana ${weekNum}`, events: currentWeek });
        weekNum++;
        weekStart = d;
        currentWeek = [ev];
      } else {
        currentWeek.push(ev);
      }
    });
    if (currentWeek.length) byWeek.push({ label: `Semana ${weekNum}`, events: currentWeek });
  }

  const totalPremium = events.filter(e => e.is_premium).length;
  const totalPacks = events.filter(e => e.type === "pack").length;

  return (
    <div className="space-y-5 slide-in">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: "Total posts", value: events.length, color: "text-primary" },
          { icon: Crown, label: "Premium", value: totalPremium, color: "text-[hsl(var(--gold))]" },
          { icon: Sparkles, label: "Packs", value: totalPacks, color: "text-purple-400" },
          { icon: TrendingUp, label: "Plataformas", value: Object.keys(PLATFORMS).filter(p => events.some(e => e.platform === p)).length, color: "text-[hsl(var(--emerald))]" },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-3 text-center group hover:border-primary/30 transition-all">
            <stat.icon className={cn("w-5 h-5 mx-auto mb-1.5", stat.color)} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Strategy section */}
      {plan && (
        <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
          <button
            onClick={() => setExpandedStrategy(!expandedStrategy)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-rose">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-display font-bold text-foreground text-lg">Estrategia del Manager IA</h3>
                <p className="text-xs text-muted-foreground">Plan estratégico mensual personalizado</p>
              </div>
            </div>
            {expandedStrategy ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {expandedStrategy && (
            <div className="px-5 pb-5 border-t border-border/50">
              <div className="prose prose-sm prose-invert max-w-none text-foreground/90 pt-4 [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary/90 [&_strong]:text-foreground [&_li]:text-foreground/80 [&_ul]:space-y-1 [&_p]:leading-relaxed">
                <ReactMarkdown>{plan}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Vista:</span>
        {(["platform", "week"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              viewMode === mode ? "gradient-primary text-primary-foreground glow-rose" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === "platform" ? "Por plataforma" : "Por semana"}
          </button>
        ))}
      </div>

      {/* Platform view */}
      {viewMode === "platform" && byPlatform.map(plat => {
        if (plat.events.length === 0) return null;
        const PIcon = plat.icon;
        return (
          <PlatformSection key={plat.id} platform={plat} />
        );
      })}

      {/* Week view */}
      {viewMode === "week" && byWeek.map((week, wi) => (
        <WeekSection key={wi} week={week} weekIndex={wi} />
      ))}
    </div>
  );
}

function PlatformSection({ platform }: { platform: any }) {
  const [expanded, setExpanded] = useState(false);
  const PIcon = platform.icon;
  const displayEvents = expanded ? platform.events : platform.events.slice(0, 4);

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden slide-in">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center", platform.gradient)}>
          <PIcon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-sm">{platform.label}</h4>
          <p className="text-[10px] text-muted-foreground">{platform.events.length} publicaciones programadas</p>
        </div>
        <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-br text-white", platform.gradient)}>
          {platform.events.length}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {displayEvents.map((ev: CalendarEvent, i: number) => (
          <EventCard key={i} event={ev} index={i} />
        ))}
        {platform.events.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {expanded ? "Ver menos" : `Ver ${platform.events.length - 4} más →`}
          </button>
        )}
      </div>
    </div>
  );
}

function WeekSection({ week, weekIndex }: { week: { label: string; events: CalendarEvent[] }; weekIndex: number }) {
  const [expanded, setExpanded] = useState(weekIndex === 0);

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden slide-in" style={{ animationDelay: `${weekIndex * 100}ms` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-foreground text-sm">{week.label}</h4>
            <p className="text-[10px] text-muted-foreground">{week.events.length} publicaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini platform indicators */}
          {Object.keys(PLATFORMS).map(pid => {
            const count = week.events.filter(e => e.platform === pid).length;
            if (!count) return null;
            const P = PLATFORMS[pid];
            return <span key={pid} className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-[9px] text-white font-bold", P.gradient)}>{count}</span>;
          })}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-2 border-t border-border/50">
          <div className="pt-3 space-y-2">
            {week.events.map((ev, i) => (
              <EventCard key={i} event={ev} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, index }: { event: CalendarEvent; index: number }) {
  const platform = PLATFORMS[event.platform];
  const typeConf = TYPE_CONFIG[event.type] || TYPE_CONFIG.text;
  const TIcon = typeConf.icon;
  const PIcon = platform?.icon;

  const eventDate = new Date(event.date + "T00:00:00");
  const dayName = eventDate.toLocaleDateString("es-CO", { weekday: "short" });
  const dayNum = eventDate.getDate();

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r transition-all hover:scale-[1.01] hover:shadow-md group",
      typeConf.gradient,
      event.is_premium && "ring-1 ring-[hsl(var(--gold))]/30"
    )}>
      {/* Date pill */}
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-[9px] uppercase text-muted-foreground font-medium">{dayName}</span>
        <span className="text-lg font-bold text-foreground leading-none">{dayNum}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {PIcon && (
            <div className={cn("w-4 h-4 rounded bg-gradient-to-br flex items-center justify-center", platform.gradient)}>
              <PIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <TIcon className="w-2.5 h-2.5" /> {typeConf.label}
          </span>
          {event.is_premium && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] font-semibold flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" /> VIP
            </span>
          )}
          {event.time && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
              <Clock className="w-2.5 h-2.5" /> {event.time}
            </span>
          )}
        </div>
        <h5 className="text-xs font-semibold text-foreground leading-tight">{event.title}</h5>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
      </div>
    </div>
  );
}
