import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Power, RefreshCw, Activity, Zap } from "lucide-react";
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
    if (!creator.telegram_bot_token) return toast.error("No hay token configurado");
    setTesting(creator.id);
    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] }),
      });
      const data = await res.json();
      if (data.ok) toast.success("✅ Webhook registrado en Telegram");
      else toast.error(data.description || "Error registrando webhook");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(null);
    }
  };

  const getBotInfo = async (creator: any) => {
    if (!creator.telegram_bot_token) return toast.error("No hay token configurado");
    setTesting(creator.id);
    try {
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        toast.success(`Bot: @${data.result.username} | ${data.result.first_name}`);
      } else {
        toast.error("Token inválido: " + data.description);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Bot AI Manager</h1>
        <p className="text-muted-foreground mt-1">Controla el bot de Telegram y la IA de cada creadora</p>
      </div>

      {/* Webhook info */}
      <div className="glass rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">URL del Webhook</h3>
            <p className="text-xs text-muted-foreground">Regístrala en cada bot de Telegram</p>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-3 font-mono text-xs text-foreground/80 break-all">
          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Haz clic en "Registrar webhook" en cada creadora para conectar el bot automáticamente.
        </p>
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">¿Cómo funciona la IA?</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { step: "1", title: "Fan escribe", desc: "El usuario envía un mensaje al bot de Telegram", emoji: "💬" },
            { step: "2", title: "Webhook recibe", desc: "El backend captura el mensaje y detecta el idioma y tono", emoji: "⚡" },
            { step: "3", title: "IA genera respuesta", desc: "Gemini genera una respuesta ultra-humana con el personaje", emoji: "🧠" },
            { step: "4", title: "Mia responde", desc: "Se envía la respuesta con pausa de typing realista", emoji: "✍️" },
          ].map(s => (
            <div key={s.step} className="bg-secondary rounded-xl p-4 text-center">
              <span className="text-2xl mb-2 block">{s.emoji}</span>
              <p className="text-xs font-semibold text-foreground mb-1">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Creators bot status */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : creators.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          No hay creadoras configuradas. Ve a "Creadoras" para crear a Mia.
        </div>
      ) : (
        <div className="space-y-4">
          {creators.map(creator => (
            <div key={creator.id} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
                      {creator.name[0]}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${creator.ai_enabled ? "status-active" : "status-inactive"}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{creator.name}</h3>
                    <p className="text-xs text-muted-foreground">@{creator.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">IA</span>
                    <Switch checked={creator.ai_enabled} onCheckedChange={() => toggleAI(creator.id, creator.ai_enabled)} />
                    <span className={`text-sm font-medium ${creator.ai_enabled ? "text-emerald" : "text-muted-foreground"}`}>
                      {creator.ai_enabled ? "Activa" : "Pausada"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Token Bot</p>
                  <p className="text-sm text-foreground font-mono truncate">{creator.telegram_bot_token ? `${creator.telegram_bot_token.slice(0, 15)}...` : "❌ No configurado"}</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Username Bot</p>
                  <p className="text-sm text-foreground">{creator.telegram_bot_username || "❌ No configurado"}</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Canal ID</p>
                  <p className="text-sm text-foreground">{creator.telegram_channel_id || "❌ No configurado"}</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Emoción actual</p>
                  <p className="text-sm text-foreground capitalize">{creator.current_emotion || "normal"}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => getBotInfo(creator)}
                  disabled={testing === creator.id}
                  variant="outline"
                  size="sm"
                  className="border-border text-sm"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  {testing === creator.id ? "Verificando..." : "Verificar bot"}
                </Button>
                <Button
                  onClick={() => registerWebhook(creator)}
                  disabled={testing === creator.id}
                  size="sm"
                  className="gradient-primary text-white glow-rose text-sm"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Registrar webhook
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
