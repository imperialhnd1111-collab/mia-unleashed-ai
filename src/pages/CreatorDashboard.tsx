import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bot, LogOut, Sparkles, Settings, BarChart3, Calendar, CreditCard, Users } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface Profile {
  full_name: string;
  avatar_url: string;
  email: string;
  creator_id: string | null;
  onboarding_complete: boolean;
}

export default function CreatorDashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Onboarding form
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    system_prompt: "",
    telegram_bot_token: "",
    telegram_channel_id: "",
  });

  useEffect(() => {
    loadProfile();
  }, [session]);

  const loadProfile = async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (p) {
      setProfile(p as any);
      if (p.creator_id) {
        const { data: c } = await supabase.from("creators").select("*").eq("id", p.creator_id).single();
        setCreator(c);
      }
    }
    setLoading(false);
  };

  const handleCreateCreator = async () => {
    if (!form.name || !form.username) {
      toast.error("Nombre y username son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const { data: newCreator, error } = await supabase.from("creators").insert({
        name: form.name,
        username: form.username.toLowerCase().replace(/\s/g, "_"),
        bio: form.bio,
        system_prompt: form.system_prompt || `Eres ${form.name}, una creadora de contenido. Responde de forma natural y cariñosa.`,
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

      setCreator(newCreator);
      toast.success("¡Tu clon de IA ha sido creado! 🎉");
      loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Error al crear");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Onboarding flow
  if (!creator) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border/40 px-6 py-3 flex items-center justify-between">
          <span className="font-display font-bold text-gradient">Creator AI</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-1" /> Salir</Button>
        </nav>
        <div className="max-w-lg mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-1">Configura tu Clon IA</h1>
            <p className="text-muted-foreground text-sm">Completa tu perfil para activar tu IA</p>
          </div>

          <div className="glass rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre artístico *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mia, Nicole..." className="bg-muted border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Username *</Label>
                <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="mia_hot" className="bg-muted border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Bio</Label>
              <Input value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Creadora de contenido exclusivo..." className="bg-muted border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Personalidad de tu IA</Label>
              <Textarea value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} placeholder="Describe cómo quieres que hable tu IA: tono, estilo, personalidad..." className="bg-muted border-border min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Token del Bot de Telegram</Label>
              <Input value={form.telegram_bot_token} onChange={e => setForm({ ...form, telegram_bot_token: e.target.value })} placeholder="123456:ABC-DEF..." className="bg-muted border-border font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Créalo con @BotFather en Telegram</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">ID del Canal (opcional)</Label>
              <Input value={form.telegram_channel_id} onChange={e => setForm({ ...form, telegram_channel_id: e.target.value })} placeholder="-100123456789" className="bg-muted border-border font-mono text-xs" />
            </div>
            <Button onClick={handleCreateCreator} disabled={saving} className="w-full gradient-primary text-white glow-rose">
              {saving ? "Creando..." : "🚀 Crear mi Clon IA"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Creator dashboard
  const stats = [
    { icon: Users, label: "Fans", value: (creator.stats as any)?.total_fans || 0 },
    { icon: CreditCard, label: "Ingresos", value: `$${(creator.stats as any)?.total_revenue || 0}` },
    { icon: Bot, label: "Mensajes", value: (creator.stats as any)?.messages_sent || 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {creator.avatar_url && <img src={creator.avatar_url} className="w-7 h-7 rounded-full object-cover" />}
          <span className="font-display font-bold text-gradient">{creator.name}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10 text-primary">IA activa</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-display font-bold mb-6">Mi Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="glass rounded-xl p-4 border border-border/50 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Bot, label: "Configurar Bot", color: "text-primary" },
            { icon: Calendar, label: "Plan de Contenido", color: "text-emerald-400" },
            { icon: CreditCard, label: "Precios", color: "text-amber-400" },
            { icon: Settings, label: "Configuración", color: "text-muted-foreground" },
          ].map((a, i) => (
            <button key={i} className="glass rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all text-center group">
              <a.icon className={`w-6 h-6 mx-auto mb-2 ${a.color} group-hover:scale-110 transition-transform`} />
              <span className="text-sm text-foreground">{a.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 glass rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Estado del Bot</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>🤖 Bot: <span className="text-foreground font-mono text-xs">@{creator.telegram_bot_username || "sin configurar"}</span></p>
            <p>📡 Canal: <span className="text-foreground font-mono text-xs">{creator.telegram_channel_id || "sin configurar"}</span></p>
            <p>🧠 IA: <span className="text-primary">{creator.ai_enabled ? "Activa" : "Inactiva"}</span></p>
            <p>💰 Comisión plataforma: <span className="text-amber-400">15%</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
