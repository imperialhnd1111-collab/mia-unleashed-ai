import { useState, useMemo } from "react";
import { Instagram, Music, Hash, Radio, Image, Video, FileText, Sparkles, Crown, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS: Record<string, { label: string; icon: any; gradient: string }> = {
  instagram: { label: "IG", icon: Instagram, gradient: "from-purple-500 to-pink-500" },
  tiktok: { label: "TT", icon: Music, gradient: "from-cyan-400 to-pink-500" },
  x: { label: "X", icon: Hash, gradient: "from-gray-400 to-gray-600" },
  telegram_vip: { label: "TG", icon: Radio, gradient: "from-blue-400 to-blue-600" },
};

const TYPE_ICONS: Record<string, { icon: any; cls: string }> = {
  photo: { icon: Image, cls: "text-blue-400" },
  video: { icon: Video, cls: "text-purple-400" },
  text: { icon: FileText, cls: "text-[hsl(var(--emerald))]" },
  pack: { icon: Sparkles, cls: "text-[hsl(var(--gold))]" },
};

export interface CalendarEvent {
  date: string;
  platform: string;
  type: string;
  title: string;
  description: string;
  time?: string;
  is_premium?: boolean;
}

interface Props {
  events: CalendarEvent[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
}

export default function CalendarGrid({ events, month, year, onMonthChange }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const monthName = new Date(year, month - 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach(ev => {
      const d = new Date(ev.date + "T00:00:00");
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [events, month, year]);

  const prevMonth = () => {
    if (month === 1) onMonthChange(12, year - 1);
    else onMonthChange(month - 1, year);
  };
  const nextMonth = () => {
    if (month === 12) onMonthChange(1, year + 1);
    else onMonthChange(month + 1, year);
  };

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h3 className="font-display font-bold text-foreground text-lg capitalize">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2 uppercase tracking-wider">{d}</div>
        ))}
        
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDay[day] || [];
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSelected = selectedDay === day;
          const hasEvents = dayEvents.length > 0;
          const platforms = [...new Set(dayEvents.map(e => e.platform))];
          const hasPremium = dayEvents.some(e => e.is_premium);

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                "aspect-square rounded-xl p-1 flex flex-col items-center justify-start gap-0.5 transition-all relative group",
                isSelected ? "gradient-primary glow-rose ring-2 ring-primary/50 scale-105" : 
                hasEvents ? "bg-muted/50 hover:bg-muted hover:scale-105" : "hover:bg-muted/30",
                isToday && !isSelected && "ring-1 ring-primary/40"
              )}
            >
              <span className={cn(
                "text-xs font-bold leading-none mt-0.5",
                isSelected ? "text-white" : isToday ? "text-primary" : "text-foreground"
              )}>
                {day}
              </span>
              
              {hasEvents && (
                <div className="flex flex-wrap gap-[2px] justify-center mt-auto mb-0.5">
                  {platforms.slice(0, 4).map(pid => {
                    const p = PLATFORMS[pid];
                    if (!p) return null;
                    return (
                      <div key={pid} className={cn("w-2.5 h-2.5 rounded-full bg-gradient-to-br", p.gradient)} />
                    );
                  })}
                </div>
              )}
              
              {hasPremium && (
                <Crown className={cn("w-2.5 h-2.5 absolute top-0.5 right-0.5", isSelected ? "text-white" : "text-[hsl(var(--gold))]")} />
              )}
              
              {hasEvents && (
                <span className={cn(
                  "text-[8px] font-bold leading-none",
                  isSelected ? "text-white/80" : "text-muted-foreground"
                )}>
                  {dayEvents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="glass rounded-2xl border border-primary/20 overflow-hidden slide-in">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h4 className="font-display font-bold text-foreground">
              📋 {new Date(year, month - 1, selectedDay).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full gradient-primary text-white font-bold">
                {selectedEvents.length} posts
              </span>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {selectedEvents.sort((a, b) => (a.time || "").localeCompare(b.time || "")).map((ev, i) => {
              const platform = PLATFORMS[ev.platform];
              const typeConf = TYPE_ICONS[ev.type] || TYPE_ICONS.text;
              const TIcon = typeConf.icon;
              const PIcon = platform?.icon;

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all slide-in",
                    ev.is_premium && "ring-1 ring-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/5"
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0", platform?.gradient)}>
                    {PIcon && <PIcon className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={cn("text-[10px] flex items-center gap-0.5", typeConf.cls)}>
                        <TIcon className="w-3 h-3" />
                      </span>
                      <span className="text-[10px] text-muted-foreground">{platform?.label}</span>
                      {ev.is_premium && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] font-semibold flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> VIP
                        </span>
                      )}
                      {ev.time && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                          <Clock className="w-2.5 h-2.5" /> {ev.time}
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-semibold text-foreground">{ev.title}</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
