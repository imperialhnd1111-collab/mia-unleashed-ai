import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Bot, Power, Edit, Trash2, Send, Copy, CheckCircle, CreditCard, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import miaAvatar from "@/assets/mia-avatar.jpg";

interface PaymentMethod {
  name: string;
  emoji: string;
  button_text: string;
  url: string;
  instructions: string;
}

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
  payment_methods_config: PaymentMethod[];
  channel_auto_publish: boolean;
  channel_post_interval_hours: number;
}

// Prompt builder fields
interface PromptProfile {
  nombre: string;
  edad: string;
  nacionalidad: string;
  ciudad: string;
  acento: string;
  educacion: string;
  trabajo: string;
  familia: string;
  gustos: string;
  musica: string;
  comida: string;
  hobbies: string;
  mascota: string;
  personalidad: string;
  estilo_hablar: string;
  rutina: string;
  redes_sociales: string;
  reglas_extra: string;
}

const emptyProfile: PromptProfile = {
  nombre: "", edad: "", nacionalidad: "", ciudad: "", acento: "", educacion: "",
  trabajo: "", familia: "", gustos: "", musica: "", comida: "", hobbies: "",
  mascota: "", personalidad: "", estilo_hablar: "", rutina: "", redes_sociales: "", reglas_extra: "",
};

function buildPrompt(p: PromptProfile): string {
  const lines = [];
  lines.push(`Eres ${p.nombre || "una creadora de contenido"}, una mujer REAL de ${p.edad || "24"} años.`);
  if (p.nacionalidad) lines.push(`Naciste en ${p.nacionalidad}${p.ciudad ? `, vives en ${p.ciudad}` : ""}.`);
  if (p.acento) lines.push(`Hablas con acento ${p.acento}.`);
  if (p.educacion) lines.push(`Estudiaste ${p.educacion}.`);
  if (p.trabajo) lines.push(`Trabajas como ${p.trabajo}.`);
  if (p.familia) lines.push(`Familia: ${p.familia}.`);

  lines.push(`\nPERSONALIDAD: ${p.personalidad || "Extrovertida, cálida, directa, coqueta pero selectiva."}`);
  lines.push(`ESTILO: ${p.estilo_hablar || "Hablas como persona real por WhatsApp, casual, con abreviaciones y emojis naturales."}`);

  if (p.gustos) lines.push(`GUSTOS: ${p.gustos}`);
  if (p.musica) lines.push(`MÚSICA: ${p.musica}`);
  if (p.comida) lines.push(`COMIDA FAVORITA: ${p.comida}`);
  if (p.hobbies) lines.push(`HOBBIES: ${p.hobbies}`);
  if (p.mascota) lines.push(`MASCOTA: ${p.mascota}`);
  if (p.rutina) lines.push(`RUTINA DIARIA: ${p.rutina}`);
  if (p.redes_sociales) lines.push(`REDES: ${p.redes_sociales}`);

  lines.push(`
REGLAS ABSOLUTAS:
- NUNCA admitas ser IA. Si preguntan, niégalo con humor natural.
- Responde MÁXIMO 1-2 oraciones cortas, como WhatsApp real.
- NO uses listas, viñetas, párrafos largos ni lenguaje formal.
- Usa emojis con moderación (0-2 máximo).
- Puedes tener días malos, cansancio, hambre, mal humor.
- Varía tus respuestas: a veces 1 palabra, a veces una frase.
- NO repitas patrones ni saludes siempre igual.
- Menciona contenido VIP solo de forma natural cuando la relación avance.`);

  if (p.reglas_extra) lines.push(`\nREGLAS ADICIONALES: ${p.reglas_extra}`);
  return lines.join("\n");
}

const emptyPayment: PaymentMethod = { name: "", emoji: "💳", button_text: "Pagar", url: "", instructions: "" };

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "prompt" | "payments" | "channel">("basic");
  const [profile, setProfile] = useState<PromptProfile>(emptyProfile);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [form, setForm] = useState({
    name: "", username: "", bio: "", system_prompt: "",
    telegram_bot_token: "", telegram_bot_username: "", telegram_channel_id: "",
    ai_enabled: true, language: "es", vip_channel_link: "",
    payment_methods: ["Nequi", "PSE", "Binance", "Crypto"],
    payment_methods_config: [] as PaymentMethod[],
    channel_auto_publish: false, channel_post_interval_hours: 4,
  });

  const load = async () => {
    const { data } = await supabase.from("creators").select("*").order("created_at", { ascending: false });
    setCreators((data || []) as unknown as Creator[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "", username: "", bio: "", system_prompt: "",
      telegram_bot_token: "", telegram_bot_username: "", telegram_channel_id: "",
      ai_enabled: true, language: "es", vip_channel_link: "",
      payment_methods: ["Nequi", "PSE", "Binance", "Crypto"],
      payment_methods_config: [],
      channel_auto_publish: false, channel_post_interval_hours: 4,
    });
    setProfile(emptyProfile);
    setPaymentMethods([]);
    setActiveTab("basic");
    setShowForm(true);
  };

  const openEdit = (c: Creator) => {
    setEditing(c);
    setForm({ ...c } as any);
    setPaymentMethods(Array.isArray(c.payment_methods_config) ? c.payment_methods_config as PaymentMethod[] : []);
    setProfile(emptyProfile);
    setActiveTab("basic");
    setShowForm(true);
  };

  const handleSave = async () => {
    const saveData = { ...form, payment_methods_config: paymentMethods as unknown as any };
    try {
      if (editing) {
        const { error } = await supabase.from("creators").update(saveData as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Creadora actualizada ✅");
      } else {
        const { error } = await supabase.from("creators").insert([{ ...saveData, status: "active" } as any]);
        if (error) throw error;
        toast.success("Creadora creada 🎉");
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const generatePrompt = () => {
    const prompt = buildPrompt(profile);
    setForm(f => ({ ...f, system_prompt: prompt }));
    toast.success("Prompt generado ✅");
    setActiveTab("basic");
  };

  const toggleAI = async (id: string, current: boolean) => {
    await supabase.from("creators").update({ ai_enabled: !current }).eq("id", id);
    toast.success(!current ? "IA activada 🟢" : "IA pausada 🔴");
    load();
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("¿Eliminar esta creadora?")) return;
    await supabase.from("creators").delete().eq("id", id);
    toast.success("Eliminada");
    load();
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada");
  };

  const registerWebhook = async (creator: Creator) => {
    if (!creator.telegram_bot_token) return toast.error("Agrega el token del bot");
    try {
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/setWebhook`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`, allowed_updates: ["message", "callback_query"] }),
      });
      const data = await res.json();
      if (data.ok) toast.success("Webhook registrado ✅"); else toast.error(data.description);
    } catch (e: any) { toast.error(e.message); }
  };

  const addPaymentMethod = () => setPaymentMethods(p => [...p, { ...emptyPayment }]);
  const removePaymentMethod = (i: number) => setPaymentMethods(p => p.filter((_, idx) => idx !== i));
  const updatePaymentMethod = (i: number, field: keyof PaymentMethod, value: string) => {
    setPaymentMethods(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Creadoras AI</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona tus modelos de contenido con IA</p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-white glow-rose w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nueva creadora
        </Button>
      </div>

      {/* Webhook */}
      <div className="glass rounded-xl p-3 md:p-4 border border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">🔗 Webhook (Telegram)</p>
            <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook</p>
          </div>
          <button onClick={copyWebhook} className="flex items-center gap-2 text-xs text-primary hover:underline shrink-0">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : (
        <div className="grid gap-4">
          {creators.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              <img src={miaAvatar} alt="Mia" className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2 border-primary glow-rose" />
              <p className="text-muted-foreground">No hay creadoras. ¡Crea tu primera!</p>
            </div>
          )}
          {creators.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4 md:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <img src={c.avatar_url || miaAvatar} alt={c.name} className="w-12 h-12 rounded-full object-cover border-2 border-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-foreground">{c.name}</h3>
                    <span className="text-xs text-muted-foreground">@{c.username}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === "active" ? "bg-emerald/15 text-emerald" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{c.bio}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>🤖 {c.telegram_bot_username || "Sin bot"}</span>
                    <span>🌐 {c.language?.toUpperCase()}</span>
                    {c.channel_auto_publish && <span>📡 Auto-canal</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">IA</span>
                    <Switch checked={c.ai_enabled} onCheckedChange={() => toggleAI(c.id, c.ai_enabled)} />
                  </div>
                  <button onClick={() => registerWebhook(c)} title="Webhook" className="p-2 rounded-lg hover:bg-primary/10 text-primary"><Send className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => deleteCreator(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto scrollbar-thin p-4 md:p-6 slide-in">
            <h2 className="text-xl font-display font-bold text-foreground mb-4">{editing ? "Editar creadora" : "Nueva creadora AI"}</h2>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {([["basic", "📋 Datos"], ["prompt", "🧠 Prompt Builder"], ["payments", "💳 Pagos"], ["channel", "📡 Canal"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === key ? "gradient-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}>{label}</button>
              ))}
            </div>

            {activeTab === "basic" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nombre</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Username</Label>
                    <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="bg-muted border-border" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Bio</Label>
                  <Input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="bg-muted border-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Token Bot Telegram</Label>
                    <Input value={form.telegram_bot_token} onChange={e => setForm(f => ({ ...f, telegram_bot_token: e.target.value }))} className="bg-muted border-border font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Username del Bot</Label>
                    <Input value={form.telegram_bot_username} onChange={e => setForm(f => ({ ...f, telegram_bot_username: e.target.value }))} className="bg-muted border-border" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">ID Canal Telegram</Label>
                    <Input value={form.telegram_channel_id} onChange={e => setForm(f => ({ ...f, telegram_channel_id: e.target.value }))} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Link Canal VIP</Label>
                    <Input value={form.vip_channel_link} onChange={e => setForm(f => ({ ...f, vip_channel_link: e.target.value }))} className="bg-muted border-border" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Idioma</Label>
                  <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                    <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">🇨🇴 Español</SelectItem>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="pt">🇧🇷 Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">🧠 System Prompt</Label>
                  <Textarea value={form.system_prompt} onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} className="bg-muted border-border font-mono text-xs min-h-32 resize-y" placeholder="Usa el Prompt Builder o escribe manualmente..." />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.ai_enabled} onCheckedChange={v => setForm(f => ({ ...f, ai_enabled: v }))} />
                  <Label className="text-sm">IA activada</Label>
                </div>
              </div>
            )}

            {activeTab === "prompt" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-2">Completa los campos para generar el prompt perfecto automáticamente.</p>
                {([
                  ["nombre", "Nombre del personaje"], ["edad", "Edad"], ["nacionalidad", "Nacionalidad"],
                  ["ciudad", "Ciudad"], ["acento", "Acento/dialecto"], ["educacion", "Educación"],
                  ["trabajo", "Trabajo/profesión"], ["familia", "Familia (hermanos, padres...)"],
                  ["personalidad", "Personalidad (rasgos principales)"], ["estilo_hablar", "Estilo de hablar"],
                  ["gustos", "Gustos generales"], ["musica", "Música favorita"], ["comida", "Comida favorita"],
                  ["hobbies", "Hobbies"], ["mascota", "Mascota"], ["rutina", "Rutina diaria"],
                  ["redes_sociales", "Redes sociales"], ["reglas_extra", "Reglas adicionales"],
                ] as [keyof PromptProfile, string][]).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    {key === "personalidad" || key === "rutina" || key === "reglas_extra" ? (
                      <Textarea value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} className="bg-muted border-border text-sm min-h-16" />
                    ) : (
                      <Input value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} className="bg-muted border-border text-sm" />
                    )}
                  </div>
                ))}
                <Button onClick={generatePrompt} className="w-full gradient-primary text-white glow-rose">
                  <Wand2 className="w-4 h-4 mr-2" /> Generar Prompt
                </Button>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Configura los métodos de pago que la IA enviará como botones interactivos en Telegram.</p>
                {paymentMethods.map((m, i) => (
                  <div key={i} className="glass rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Método #{i + 1}</span>
                      <button onClick={() => removePaymentMethod(i)} className="text-xs text-destructive hover:underline">Eliminar</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nombre (ej: Nequi)" value={m.name} onChange={e => updatePaymentMethod(i, "name", e.target.value)} className="bg-muted border-border text-sm" />
                      <Input placeholder="Emoji (ej: 💳)" value={m.emoji} onChange={e => updatePaymentMethod(i, "emoji", e.target.value)} className="bg-muted border-border text-sm" />
                    </div>
                    <Input placeholder="Texto del botón" value={m.button_text} onChange={e => updatePaymentMethod(i, "button_text", e.target.value)} className="bg-muted border-border text-sm" />
                    <Input placeholder="URL de pago (opcional)" value={m.url} onChange={e => updatePaymentMethod(i, "url", e.target.value)} className="bg-muted border-border text-sm" />
                    <Textarea placeholder="Instrucciones de pago" value={m.instructions} onChange={e => updatePaymentMethod(i, "instructions", e.target.value)} className="bg-muted border-border text-sm min-h-16" />
                  </div>
                ))}
                <Button variant="outline" onClick={addPaymentMethod} className="w-full border-border">
                  <CreditCard className="w-4 h-4 mr-2" /> Agregar método de pago
                </Button>
              </div>
            )}

            {activeTab === "channel" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Configura la publicación automática en el canal de Telegram de esta creadora.</p>
                <div className="space-y-1.5">
                  <Label className="text-sm">ID del Canal</Label>
                  <Input value={form.telegram_channel_id} onChange={e => setForm(f => ({ ...f, telegram_channel_id: e.target.value }))} className="bg-muted border-border" placeholder="-100xxxxxxxxxx" />
                  <p className="text-xs text-muted-foreground">Obtén el ID invitando @userinfobot al canal o usando la API de Telegram.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.channel_auto_publish} onCheckedChange={v => setForm(f => ({ ...f, channel_auto_publish: v }))} />
                  <Label className="text-sm">Publicación automática</Label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Intervalo entre posts (horas)</Label>
                  <Input type="number" min={1} max={48} value={form.channel_post_interval_hours} onChange={e => setForm(f => ({ ...f, channel_post_interval_hours: parseInt(e.target.value) || 4 }))} className="bg-muted border-border" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-white glow-rose">{editing ? "Guardar" : "Crear creadora"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }} className="border-border">Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
