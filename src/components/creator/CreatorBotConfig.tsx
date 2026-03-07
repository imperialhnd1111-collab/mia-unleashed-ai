import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bot, Save, Loader2, ExternalLink } from "lucide-react";

interface Props {
  creator: any;
  onUpdate: () => void;
}

export default function CreatorBotConfig({ creator, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    telegram_bot_token: creator.telegram_bot_token || "",
    telegram_channel_id: creator.telegram_channel_id || "",
    vip_channel_link: creator.vip_channel_link || "",
    system_prompt: creator.system_prompt || "",
    ai_enabled: creator.ai_enabled ?? true,
    channel_auto_publish: creator.channel_auto_publish ?? false,
    channel_post_interval_hours: creator.channel_post_interval_hours || 4,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("creators").update({
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_channel_id: form.telegram_channel_id || null,
        vip_channel_link: form.vip_channel_link || null,
        system_prompt: form.system_prompt,
        ai_enabled: form.ai_enabled,
        channel_auto_publish: form.channel_auto_publish,
        channel_post_interval_hours: form.channel_post_interval_hours,
      }).eq("id", creator.id);

      if (error) throw error;

      // Register webhook if token provided
      if (form.telegram_bot_token && form.telegram_bot_token !== creator.telegram_bot_token) {
        try {
          const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook/${form.telegram_bot_token}`;
          const tgResp = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/setWebhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
          });
          const tgData = await tgResp.json();
          if (tgData.ok) {
            // Get bot info
            const infoResp = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/getMe`);
            const infoData = await infoResp.json();
            if (infoData.ok) {
              await supabase.from("creators").update({
                telegram_bot_username: infoData.result.username,
              }).eq("id", creator.id);
            }
            toast.success("✅ Bot conectado y webhook configurado");
          } else {
            toast.error("Token inválido o error al configurar webhook");
          }
        } catch {
          toast.error("Error al conectar con Telegram");
        }
      } else {
        toast.success("Configuración guardada ✅");
      }
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">Configuración del Bot</h2>
          <p className="text-xs text-muted-foreground">Conecta y configura tu bot de Telegram</p>
        </div>
      </div>

      <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
        <h3 className="font-semibold text-sm flex items-center gap-2">📱 Telegram Bot</h3>

        <div className="glass rounded-lg p-3 border border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground">
            <strong>Paso 1:</strong> Abre <a href="https://t.me/BotFather" target="_blank" className="text-primary underline">@BotFather</a> en Telegram<br />
            <strong>Paso 2:</strong> Envía <code className="text-primary">/newbot</code><br />
            <strong>Paso 3:</strong> Copia el token y pégalo aquí
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Token del Bot</Label>
          <Input
            value={form.telegram_bot_token}
            onChange={e => setForm({ ...form, telegram_bot_token: e.target.value })}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="bg-muted border-border font-mono text-xs"
          />
        </div>

        {creator.telegram_bot_username && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400">Bot activo: @{creator.telegram_bot_username}</span>
            <a href={`https://t.me/${creator.telegram_bot_username}`} target="_blank" className="ml-auto">
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
        <h3 className="font-semibold text-sm flex items-center gap-2">📡 Canales de Telegram</h3>

        <div className="space-y-1.5">
          <Label className="text-sm">ID del Canal Público</Label>
          <Input
            value={form.telegram_channel_id}
            onChange={e => setForm({ ...form, telegram_channel_id: e.target.value })}
            placeholder="-1001234567890"
            className="bg-muted border-border font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">Canal donde se publican posts automáticos</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Link del Canal VIP (privado)</Label>
          <Input
            value={form.vip_channel_link}
            onChange={e => setForm({ ...form, vip_channel_link: e.target.value })}
            placeholder="https://t.me/+AbCdEfGhIjK"
            className="bg-muted border-border font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">Link de invitación para suscriptores VIP</p>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
          <div>
            <p className="text-sm font-medium">Auto-publicar en canal</p>
            <p className="text-xs text-muted-foreground">Publica contenido automáticamente</p>
          </div>
          <Switch checked={form.channel_auto_publish} onCheckedChange={v => setForm({ ...form, channel_auto_publish: v })} />
        </div>

        {form.channel_auto_publish && (
          <div className="space-y-1.5">
            <Label className="text-sm">Intervalo entre posts (horas)</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={form.channel_post_interval_hours}
              onChange={e => setForm({ ...form, channel_post_interval_hours: parseInt(e.target.value) || 4 })}
              className="bg-muted border-border w-24"
            />
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
        <h3 className="font-semibold text-sm flex items-center gap-2">🧠 Inteligencia Artificial</h3>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
          <div>
            <p className="text-sm font-medium">IA Activa</p>
            <p className="text-xs text-muted-foreground">Tu clon responde automáticamente</p>
          </div>
          <Switch checked={form.ai_enabled} onCheckedChange={v => setForm({ ...form, ai_enabled: v })} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Personalidad de tu IA</Label>
          <Textarea
            value={form.system_prompt}
            onChange={e => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="Describe la personalidad, tono y estilo de tu clon..."
            className="bg-muted border-border min-h-[120px] text-sm"
          />
          <p className="text-xs text-muted-foreground">💡 Cuanto más detallado, más natural será tu clon</p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-white glow-rose h-12">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {saving ? "Guardando..." : "Guardar Configuración"}
      </Button>
    </div>
  );
}
