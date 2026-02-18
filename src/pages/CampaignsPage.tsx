import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Send, Users, Target, TrendingUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Campaign {
  id: string;
  name: string;
  description: string;
  message_template: string;
  status: string;
  scheduled_at: string;
  total_sent: number;
  total_converted: number;
  revenue_generated: number;
  creators?: { name: string };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [form, setForm] = useState({
    creator_id: "",
    name: "",
    description: "",
    message_template: "",
    has_payment_button: false,
    payment_data: {} as any,
    status: "draft",
    scheduled_at: "",
  });

  const load = async () => {
    const [{ data: c }, { data: camp }] = await Promise.all([
      supabase.from("creators").select("id, name"),
      supabase.from("campaigns").select("*, creators(name)").order("created_at", { ascending: false }),
    ]);
    setCreators(c || []);
    setCampaigns(camp || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.creator_id || !form.name || !form.message_template) {
      return toast.error("Completa los campos obligatorios");
    }
    try {
      const { error } = await supabase.from("campaigns").insert([{
        creator_id: form.creator_id,
        name: form.name,
        description: form.description,
        message_template: form.message_template,
        has_payment_button: form.has_payment_button,
        payment_data: form.payment_data,
        status: "draft",
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      }]);
      if (error) throw error;
      toast.success("Campaña creada ✅");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const launchCampaign = async (id: string) => {
    setLaunching(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ campaign_id: id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Campaña enviada a ${data.sent || 0} fans 🚀`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Error al lanzar campaña");
    } finally {
      setLaunching(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      active: "bg-primary/15 text-primary",
      completed: "bg-emerald/15 text-emerald",
      paused: "bg-gold/15 text-gold",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Campañas</h1>
          <p className="text-muted-foreground mt-1">Broadcasts masivos a todos tus fans</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-white glow-rose">
          <Plus className="w-4 h-4 mr-2" /> Nueva campaña
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Campañas activas", value: campaigns.filter(c => c.status === "active").length, icon: Target },
          { label: "Mensajes enviados", value: campaigns.reduce((a, c) => a + (c.total_sent || 0), 0), icon: Send },
          { label: "Ingresos generados", value: `$${campaigns.reduce((a, c) => a + (c.revenue_generated || 0), 0).toFixed(2)}`, icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay campañas. Crea tu primer broadcast.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="glass rounded-xl p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{c.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(c.status)}`}>{c.status}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{c.message_template}</p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span><Users className="w-3 h-3 inline mr-1" />{c.total_sent} enviados</span>
                  <span><TrendingUp className="w-3 h-3 inline mr-1" />{c.total_converted} conversiones</span>
                  <span>💰 ${c.revenue_generated || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.status === "draft" && (
                  <Button
                    onClick={() => launchCampaign(c.id)}
                    disabled={launching === c.id}
                    className="gradient-primary text-white text-sm glow-rose"
                    size="sm"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {launching === c.id ? "Enviando..." : "Lanzar"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin p-6 slide-in">
            <h2 className="text-xl font-display font-bold text-foreground mb-6">Nueva campaña</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Creadora</Label>
                <Select value={form.creator_id} onValueChange={v => setForm(f => ({ ...f, creator_id: v }))}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Selecciona creadora" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre de la campaña *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border" placeholder="Ej: Lanzamiento contenido VIP" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Descripción (interna)</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-muted border-border" placeholder="Notas internas..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Mensaje del broadcast *</Label>
                <Textarea
                  value={form.message_template}
                  onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                  className="bg-muted border-border min-h-32"
                  placeholder="Hola amor! 🔥 Tengo algo especial para ti hoy..."
                />
                <p className="text-xs text-muted-foreground">Escríbelo en el tono de la creadora. Sin botones, solo texto natural.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Programar envío (opcional)</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="bg-muted border-border" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.has_payment_button} onCheckedChange={v => setForm(f => ({ ...f, has_payment_button: v }))} />
                <Label className="text-sm">Incluir botón de pago</Label>
              </div>
              {form.has_payment_button && (
                <div className="glass rounded-xl p-4 space-y-2">
                  <Input className="bg-muted border-border" placeholder="Texto del botón (ej: Ver contenido exclusivo 🔥)" onChange={e => setForm(f => ({ ...f, payment_data: { ...f.payment_data, button_text: e.target.value } }))} />
                  <Input className="bg-muted border-border" placeholder="URL de pago o link" onChange={e => setForm(f => ({ ...f, payment_data: { ...f.payment_data, url: e.target.value } }))} />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-white glow-rose">Crear campaña</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-border">Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Megaphone({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
