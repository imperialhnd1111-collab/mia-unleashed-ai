import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Shield, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { pushNotification } from "@/hooks/use-notifications";
import { PageHeader, StatCard, EmptyState } from "@/components/shared";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";

interface BotError {
  id: string;
  creator_id: string;
  error_type: string;
  error_message: string;
  severity: string;
  resolved: boolean;
  created_at: string;
  error_context: Record<string, unknown>;
  creator_name?: string;
}

type FilterType = "all" | "unresolved" | "critical";

const severityConfig: Record<string, { color: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle, label: "Crítico" },
  error: { color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Error" },
  warning: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Clock, label: "Aviso" },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MonitoringPage() {
  const [filter, setFilter] = useState<FilterType>("unresolved");

  const fetchErrors = async (): Promise<BotError[]> => {
    let query = supabase.from("bot_errors").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter === "unresolved") query = query.eq("resolved", false);
    if (filter === "critical") query = query.eq("severity", "critical");
    const { data } = await query;
    if (!data || data.length === 0) return [];

    const creatorIds = [...new Set(data.map(e => e.creator_id))];
    const { data: creators } = await supabase.from("creators").select("id, name").in("id", creatorIds);
    const nameMap = new Map(creators?.map(c => [c.id, c.name]) || []);
    return data.map(e => ({ ...e, creator_name: nameMap.get(e.creator_id) || "Sistema" })) as BotError[];
  };

  const { data: errors, loading, refetch } = useSupabaseQuery<BotError[]>([], fetchErrors, [filter]);

  // Realtime subscription for new errors
  useEffect(() => {
    const channel = supabase
      .channel("bot-errors-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bot_errors" }, (payload) => {
        const err = payload.new as BotError;
        pushNotification({
          type: "system",
          title: `Bot Error: ${err.error_type}`,
          message: err.error_message.slice(0, 100),
          icon: err.severity === "critical" ? "🚨" : "⚠️",
        });
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const resolveError = async (id: string) => {
    await supabase.from("bot_errors").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success("Error marcado como resuelto");
    refetch();
  };

  const resolveAll = async () => {
    await supabase.from("bot_errors").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("resolved", false);
    toast.success("Todos los errores resueltos");
    refetch();
  };

  const unresolvedCount = errors.filter(e => !e.resolved).length;
  const criticalCount = errors.filter(e => e.severity === "critical" && !e.resolved).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoreo del Bot"
        description="Errores y alertas en tiempo real"
        icon={Shield}
        actions={
          <Button onClick={refetch} variant="outline" size="sm" className="border-border">
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
        }
      />

      {/* Health Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 border border-border/50 text-center">
          <p className="text-2xl font-bold text-foreground">{unresolvedCount}</p>
          <p className="text-xs text-muted-foreground">Sin resolver</p>
        </div>
        <div className="glass rounded-xl p-4 border border-destructive/30 text-center">
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Críticos</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50 text-center">
          <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${criticalCount === 0 ? "bg-emerald-500" : "bg-destructive animate-pulse"}`} />
          <p className="text-xs text-muted-foreground">{criticalCount === 0 ? "Bot OK" : "Requiere atención"}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["unresolved", "critical", "all"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "gradient-primary text-white" : "border-border"}
          >
            {f === "unresolved" ? "Sin resolver" : f === "critical" ? "Críticos" : "Todos"}
          </Button>
        ))}
        {unresolvedCount > 0 && (
          <Button onClick={resolveAll} variant="outline" size="sm" className="ml-auto border-border text-xs">
            <CheckCircle className="w-3 h-3 mr-1" /> Resolver todos
          </Button>
        )}
      </div>

      {/* Error List */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : errors.length === 0 ? (
        <EmptyState icon={CheckCircle} title="Sin errores" description="El bot funciona correctamente" />
      ) : (
        <div className="space-y-3">
          {errors.map(err => {
            const config = severityConfig[err.severity] || severityConfig.error;
            const Icon = config.icon;
            return (
              <div key={err.id} className={`glass rounded-xl p-4 border ${err.resolved ? "border-border/30 opacity-60" : config.color.split(" ")[2] || "border-border/50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color.split(" ").slice(0, 2).join(" ")}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">{err.error_type}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>{config.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(err.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1 break-words">{err.error_message.slice(0, 200)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">👤 {err.creator_name}</p>
                    </div>
                  </div>
                  {!err.resolved && (
                    <Button onClick={() => resolveError(err.id)} variant="ghost" size="sm" className="shrink-0 text-xs">
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
