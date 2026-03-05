import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, ShoppingCart, Brain, CalendarDays, MessageCircle, Settings, X } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: any; cls: string; label: string }> = {
  sale: { icon: ShoppingCart, cls: "bg-[hsl(var(--emerald))]/20 text-[hsl(var(--emerald))]", label: "Venta" },
  agent: { icon: Brain, cls: "bg-primary/20 text-primary", label: "Agente IA" },
  content: { icon: CalendarDays, cls: "bg-purple-500/20 text-purple-400", label: "Contenido" },
  interaction: { icon: MessageCircle, cls: "bg-blue-500/20 text-blue-400", label: "Interacción" },
  system: { icon: Settings, cls: "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]", label: "Sistema" },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();

  const formatTime = (d: Date) => {
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "ahora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full gradient-primary text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 glass rounded-2xl border border-border shadow-lg overflow-hidden slide-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-bold text-foreground text-sm">🔔 Notificaciones</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Marcar todas leídas">
                    <CheckCheck className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Limpiar">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                </div>
              ) : (
                notifications.slice(0, 30).map((notif) => {
                  const conf = typeConfig[notif.type] || typeConfig.system;
                  const Icon = conf.icon;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border/30",
                        !notif.read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", conf.cls)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{notif.title}</span>
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", conf.cls)}>{conf.label}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(notif.timestamp)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
