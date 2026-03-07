import { Users, CreditCard, Bot, TrendingUp, MessageSquare, Gift } from "lucide-react";

interface Props {
  creator: any;
}

export default function CreatorStats({ creator }: Props) {
  const stats = creator.stats as any || {};

  const items = [
    { icon: Users, label: "Fans", value: stats.total_fans || 0, color: "text-blue-400" },
    { icon: CreditCard, label: "Ingresos", value: `$${stats.total_revenue || 0}`, color: "text-emerald-400" },
    { icon: MessageSquare, label: "Mensajes", value: stats.messages_sent || 0, color: "text-primary" },
    { icon: Gift, label: "Regalos", value: stats.gifts_received || 0, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-bold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" /> Resumen
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((s, i) => (
          <div key={i} className="glass rounded-xl p-4 border border-border/50 text-center hover:border-primary/20 transition-colors">
            <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bot Status */}
      <div className="glass rounded-xl p-4 border border-border/50">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Estado
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${creator.telegram_bot_username ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-muted-foreground">Bot:</span>
            <span className="font-mono text-xs">{creator.telegram_bot_username ? `@${creator.telegram_bot_username}` : "Sin configurar"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${creator.telegram_channel_id ? "bg-emerald-500" : "bg-muted-foreground"}`} />
            <span className="text-muted-foreground">Canal:</span>
            <span className="font-mono text-xs">{creator.telegram_channel_id ? "Conectado" : "Sin configurar"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${creator.ai_enabled ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-muted-foreground">IA:</span>
            <span className={creator.ai_enabled ? "text-primary" : ""}>{creator.ai_enabled ? "Activa" : "Inactiva"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Comisión:</span>
            <span className="text-primary font-semibold">15%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
