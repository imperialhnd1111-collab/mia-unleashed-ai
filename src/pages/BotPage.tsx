import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, RefreshCw, Activity, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function BotPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("creators").select("*");
    setCreators(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAI = async (id: string, current: boolean) => {
    await supabase.from("creators").update({ ai_enabled: !current }).eq("id", id);
    toast.success(!current ? "🟢 IA activada" : "🔴 IA pausada");
    load();
  };

  const registerWebhook = async (creator: any) => {
    if (!creator.telegram_bot_token) return toast.error("No hay token");
    setTesting(creator.id);
    try {
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/setWebhook`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`, allowed_updates: ["message", "callback_query"] }),
      });
      const data = await res.json();
      if (data.ok) toast.success("✅ Webhook registrado"); else toast.error(data.description);
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(null); }
  };

  const getBotInfo = async (creator: any) => {
    if (!creator.telegram_bot_token) return toast.error("No hay token");
    setTesting(creator.id);
    try {
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/getMe`);
      const data = await res.json();
      if (data.ok) toast.success(`Bot: @${data.result.username}`); else toast.error("Token inválido");
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Bot AI Manager</h1>
        <p className="text-muted-foreground mt-1 text-sm">Controla el bot de Telegram de cada creadora</p>
      </div>

      <div className="glass rounded-2xl p-4 border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">URL del Webhook</h3>
            <p className="text-xs text-muted-foreground">Regístrala en cada bot</p>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-3 font-mono text-xs text-foreground/80 break-all">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook</div>
        <p className="text-xs text-muted-foreground mt-2">💡 Haz clic en "Registrar webhook" para conectar cada bot.</p>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-3 text-sm">¿Cómo funciona?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: "1", title: "Fan escribe", emoji: "💬" },
            { step: "2", title: "Webhook recibe", emoji: "⚡" },
            { step: "3", title: "IA responde", emoji: "🧠" },
            { step: "4", title: "Mensaje enviado", emoji: "✍️" },
          ].map(s => (
            <div key={s.step} className="bg-secondary rounded-xl p-3 text-center">
              <span className="text-xl mb-1 block">{s.emoji}</span>
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : creators.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Sin creadoras. Ve a "Creadoras" primero.</div>
      ) : (
        <div className="space-y-4">
          {creators.map(creator => (
            <div key={creator.id} className="glass rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">{creator.name[0]}</div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${creator.ai_enabled ? "status-active" : "status-inactive"}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{creator.name}</h3>
                    <p className="text-xs text-muted-foreground">@{creator.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">IA</span>
                  <Switch checked={creator.ai_enabled} onCheckedChange={() => toggleAI(creator.id, creator.ai_enabled)} />
                  <span className={`text-xs font-medium ${creator.ai_enabled ? "text-emerald" : "text-muted-foreground"}`}>{creator.ai_enabled ? "Activa" : "Pausada"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Token</p>
                  <p className="text-xs text-foreground font-mono truncate">{creator.telegram_bot_token ? `${creator.telegram_bot_token.slice(0, 12)}...` : "❌"}</p>
                </div>
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Bot</p>
                  <p className="text-xs text-foreground">{creator.telegram_bot_username || "❌"}</p>
                </div>
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Canal</p>
                  <p className="text-xs text-foreground">{creator.telegram_channel_id || "❌"}</p>
                </div>
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Emoción</p>
                  <p className="text-xs text-foreground capitalize">{creator.current_emotion || "normal"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => getBotInfo(creator)} disabled={testing === creator.id} variant="outline" size="sm" className="border-border text-xs">
                  <Activity className="w-3 h-3 mr-1" /> Verificar
                </Button>
                <Button onClick={() => registerWebhook(creator)} disabled={testing === creator.id} size="sm" className="gradient-primary text-white glow-rose text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Registrar webhook
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
