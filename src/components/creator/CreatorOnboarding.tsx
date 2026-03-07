import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, LogOut, Bot, MessageSquare, Zap } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface Props {
  session: Session;
  onCreated: () => void;
  onLogout: () => void;
}

export default function CreatorOnboarding({ session, onCreated, onLogout }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    system_prompt: "",
    telegram_bot_token: "",
    telegram_channel_id: "",
  });

  const handleCreate = async () => {
    if (!form.name || !form.username) {
      toast.error("Nombre y username son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const { data: newCreator, error } = await supabase.from("creators").insert({
        name: form.name,
        username: form.username.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        bio: form.bio,
        system_prompt: form.system_prompt || `Eres ${form.name}, una creadora de contenido exclusivo. Responde de forma natural, cariñosa y seductora. Usa emojis ocasionalmente.`,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_channel_id: form.telegram_channel_id || null,
        ai_enabled: true,
        status: "active",
      }).select().single();

      if (error) throw error;

      await supabase.from("profiles").update({
        creator_id: newCreator.id,
        onboarding_complete: true,
      }).eq("id", session.user.id);

      toast.success("¡Tu clon de IA ha sido creado! 🎉");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Error al crear");
    }
    setSaving(false);
  };

  const steps = [
    {
      title: "Tu identidad",
      subtitle: "¿Cómo quieres que te conozcan?",
      icon: Sparkles,
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre artístico *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Valentina, Camila, Nicole..." className="bg-muted border-border h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label>Username único *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="valentina_vip" className="bg-muted border-border h-12 text-base pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio / Descripción</Label>
            <Input value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Creadora de contenido exclusivo..." className="bg-muted border-border h-12" />
          </div>
        </div>
      ),
    },
    {
      title: "Personalidad IA",
      subtitle: "Define cómo habla tu clon",
      icon: MessageSquare,
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>¿Cómo quieres que hable tu IA?</Label>
            <Textarea
              value={form.system_prompt}
              onChange={e => setForm({ ...form, system_prompt: e.target.value })}
              placeholder={`Ejemplo: Soy cariñosa y coqueta, uso muchos emojis 💕. Me encanta hacer sentir especial a cada fan. Hablo en español y soy muy divertida...`}
              className="bg-muted border-border min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground">💡 Entre más detallada sea la personalidad, mejor será tu clon</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "🥰 Cariñosa", prompt: "Soy muy cariñosa, dulce y tierna. Me gusta hacer sentir especial a cada persona." },
              { label: "🔥 Atrevida", prompt: "Soy atrevida, directa y segura de mí misma. Me encanta el flirteo." },
              { label: "😊 Amigable", prompt: "Soy amigable, cercana y divertida. Hablo como una amiga de confianza." },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setForm({ ...form, system_prompt: `Eres ${form.name || "una creadora"}. ${preset.prompt} Usa emojis ocasionalmente y responde en español.` })}
                className="p-3 rounded-lg border border-border bg-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-center"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Conecta tu Bot",
      subtitle: "Conecta Telegram para empezar",
      icon: Bot,
      content: (
        <div className="space-y-4">
          <div className="glass rounded-lg p-4 border border-primary/20 bg-primary/5">
            <h4 className="font-semibold text-sm mb-2">📱 ¿Cómo crear tu bot?</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Abre Telegram y busca <span className="text-primary font-mono">@BotFather</span></li>
              <li>Envía el comando <span className="text-primary font-mono">/newbot</span></li>
              <li>Elige un nombre y username para tu bot</li>
              <li>Copia el <strong>token</strong> que te da BotFather</li>
              <li>Pégalo aquí abajo 👇</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <Label>Token del Bot *</Label>
            <Input
              value={form.telegram_bot_token}
              onChange={e => setForm({ ...form, telegram_bot_token: e.target.value })}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="bg-muted border-border h-12 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label>ID del Canal de Telegram (opcional)</Label>
            <Input
              value={form.telegram_channel_id}
              onChange={e => setForm({ ...form, telegram_channel_id: e.target.value })}
              placeholder="-1001234567890"
              className="bg-muted border-border h-12 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Si tienes un canal público o privado, pega el ID aquí</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">⚡ Puedes configurar esto después si lo prefieres</p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/40 px-6 py-3 flex items-center justify-between">
        <span className="font-display font-bold text-gradient">Creator AI</span>
        <Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="w-4 h-4 mr-1" /> Salir</Button>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold">{currentStep.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{currentStep.subtitle}</p>
        </div>

        <div className="glass rounded-xl p-6 mb-6">
          {currentStep.content}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Atrás</Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => {
                if (step === 0 && (!form.name || !form.username)) {
                  toast.error("Nombre y username son obligatorios");
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 gradient-primary text-white"
            >
              Siguiente →
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving} className="flex-1 gradient-primary text-white glow-rose">
              {saving ? "Creando..." : "🚀 Crear mi Clon IA"}
            </Button>
          )}
        </div>

        {step === steps.length - 1 && !form.telegram_bot_token && (
          <button onClick={handleCreate} disabled={saving} className="w-full text-center mt-3 text-sm text-muted-foreground hover:text-primary transition-colors">
            Saltar y configurar después →
          </button>
        )}
      </div>
    </div>
  );
}
