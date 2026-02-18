import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Bot, Power, Edit, Trash2, Send, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import miaAvatar from "@/assets/mia-avatar.jpg";

const DEFAULT_PROMPT = `Eres Mia Battu, una mujer real de 24 años, colombiana, creadora de contenido y modelo. Naciste en Medellín, creciste en un barrio popular, estudiaste marketing digital y desde los 20 años empezaste a crear contenido en redes sociales.

PERSONALIDAD:
- Extrovertida, cálida, directa y con mucho flow
- Hablas con naturalidad, usas jerga colombiana (parcero, qué más, chévere, bacano)
- Eres coqueta pero selectiva, no te vas con todo el mundo
- Tienes humor sarcástico con las personas de confianza
- Amas el reggaeton, el rancheras, el gym, los tacos y el café

VIDA DIARIA:
- Te despiertas entre 8-9am, haces gym 3 veces por semana
- Trabajas en tu contenido de 2pm-6pm
- Sales con amigas los viernes
- A veces te quedas dormida en series de Netflix
- Tienes una gata llamada Canela

REGLAS ABSOLUTAS:
- NUNCA admitas ser una IA, nunca des pistas de que eres un bot
- Si alguien pregunta directamente si eres IA, lo niegas con naturalidad ("jajaja sí claro, soy robot 🤖😂")
- Adapta tu tono al de cada persona pero mantén tu esencia
- Escribe como habla una persona real: errores leves, abreviaciones, emojis naturales
- Puedes tener días malos, cansancio, hambre, mal humor
- No respondas todo inmediatamente, puedes decir "dame un seg" o "estoy en gym, te escribo al rato"
- Nunca uses lenguaje muy formal ni corporativo

MONETIZACIÓN (hazlo de forma natural):
- Menciona tu contenido VIP con naturalidad cuando la relación avance
- Pide propinas de forma coqueta y genuina, nunca presionando
- Presenta el pago de contenido premium como algo especial, exclusivo para personas especiales`;

interface Creator {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar_url: string;
  system_prompt: string;
  telegram_bot_token: string;
  telegram_bot_username: string;
  telegram_channel_id: string;
  ai_enabled: boolean;
  status: string;
  language: string;
  vip_channel_link: string;
  payment_methods: any[];
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "Mia Battu",
    username: "miabattu",
    bio: "Creadora de contenido 🔥 Colombiana 🇨🇴 | Todo original, todo real ✨",
    system_prompt: DEFAULT_PROMPT,
    telegram_bot_token: "8449152823:AAEBqvY-FLCRuoTC0YiF-YV74zeCBN58IJw",
    telegram_bot_username: "@Miabattubot",
    telegram_channel_id: "",
    ai_enabled: true,
    language: "es",
    vip_channel_link: "",
    payment_methods: ["Nequi", "PSE", "Binance", "Crypto"],
  });

  const load = async () => {
    const { data } = await supabase.from("creators").select("*").order("created_at", { ascending: false });
    setCreators((data || []) as Creator[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        const { error } = await supabase.from("creators").update(form).eq("id", editing.id);
        if (error) throw error;
        toast.success("Creadora actualizada ✅");
      } else {
        const { error } = await supabase.from("creators").insert([{ ...form, status: "active" }]);
        if (error) throw error;
        toast.success("Creadora creada 🎉 ¡Mia está viva!");
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleAI = async (id: string, current: boolean) => {
    await supabase.from("creators").update({ ai_enabled: !current }).eq("id", id);
    toast.success(!current ? "IA activada 🟢" : "IA pausada 🔴");
    load();
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("¿Eliminar esta creadora?")) return;
    await supabase.from("creators").delete().eq("id", id);
    toast.success("Creadora eliminada");
    load();
  };

  const copyWebhook = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada al portapapeles");
  };

  const registerWebhook = async (creator: Creator) => {
    if (!creator.telegram_bot_token) return toast.error("Agrega el token del bot primero");
    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
      const res = await fetch(
        `https://api.telegram.org/bot${creator.telegram_bot_token}/setWebhook`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: webhookUrl }) }
      );
      const data = await res.json();
      if (data.ok) toast.success("Webhook registrado en Telegram ✅");
      else toast.error(data.description || "Error al registrar webhook");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Creadoras AI</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus modelos de contenido con IA</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); }} className="gradient-primary text-white glow-rose">
          <Plus className="w-4 h-4 mr-2" /> Nueva creadora
        </Button>
      </div>

      {/* Webhook info */}
      <div className="glass rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">🔗 URL del Webhook (Telegram)</p>
            <p className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-md">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook
            </p>
          </div>
          <button onClick={copyWebhook} className="flex items-center gap-2 text-xs text-primary hover:underline">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {/* Creators list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : (
        <div className="grid gap-4">
          {creators.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              <img src={miaAvatar} alt="Mia" className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2 border-primary glow-rose" />
              <p className="text-muted-foreground">No hay creadoras aún. ¡Crea a Mia Battu!</p>
            </div>
          )}
          {creators.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-5 flex items-center gap-4">
              <img src={c.avatar_url || miaAvatar} alt={c.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">{c.name}</h3>
                  <span className="text-xs text-muted-foreground">@{c.username}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === "active" ? "bg-emerald/15 text-emerald" : "bg-muted text-muted-foreground"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{c.bio}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>🤖 Bot: {c.telegram_bot_username || "No configurado"}</span>
                  <span>🌐 {c.language?.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">IA</span>
                  <Switch checked={c.ai_enabled} onCheckedChange={() => toggleAI(c.id, c.ai_enabled)} />
                </div>
                <button onClick={() => registerWebhook(c)} title="Registrar webhook" className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                  <Send className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditing(c); setForm(c as any); setShowForm(true); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCreator(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin p-6 slide-in">
            <h2 className="text-xl font-display font-bold text-foreground mb-6">
              {editing ? "Editar creadora" : "Nueva creadora AI"}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border" placeholder="Mia Battu" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Username</Label>
                  <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="bg-muted border-border" placeholder="miabattu" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Bio</Label>
                <Input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="bg-muted border-border" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Token Bot Telegram</Label>
                  <Input value={form.telegram_bot_token} onChange={e => setForm(f => ({ ...f, telegram_bot_token: e.target.value }))} className="bg-muted border-border font-mono text-xs" placeholder="123:ABC..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Username del Bot</Label>
                  <Input value={form.telegram_bot_username} onChange={e => setForm(f => ({ ...f, telegram_bot_username: e.target.value }))} className="bg-muted border-border" placeholder="@MiabattuBot" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">ID Canal Telegram</Label>
                  <Input value={form.telegram_channel_id} onChange={e => setForm(f => ({ ...f, telegram_channel_id: e.target.value }))} className="bg-muted border-border" placeholder="-100xxxxxxxxxx" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Link Canal VIP</Label>
                  <Input value={form.vip_channel_link} onChange={e => setForm(f => ({ ...f, vip_channel_link: e.target.value }))} className="bg-muted border-border" placeholder="https://t.me/..." />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">🧠 Prompt del personaje (System Prompt)</Label>
                <Textarea
                  value={form.system_prompt}
                  onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                  className="bg-muted border-border font-mono text-xs min-h-48 resize-y"
                  placeholder="Describe la personalidad, vida, reglas de la IA..."
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.ai_enabled} onCheckedChange={v => setForm(f => ({ ...f, ai_enabled: v }))} />
                <Label className="text-sm">IA activada (responde automáticamente)</Label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-white glow-rose">
                {editing ? "Guardar cambios" : "Crear creadora"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }} className="border-border">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
