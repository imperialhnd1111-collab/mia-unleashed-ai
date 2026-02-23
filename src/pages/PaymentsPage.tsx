import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Wallet, Star, Coins, Save, Loader2, CheckCircle, XCircle, Plus, Trash2, Gift, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const providerMeta: Record<string, { icon: any; emoji: string; label: string; color: string }> = {
  wompi: { icon: CreditCard, emoji: "💳", label: "Wompi (Nequi, PSE, Tarjeta)", color: "text-emerald" },
  binance: { icon: Coins, emoji: "🪙", label: "Binance Pay (Crypto/USDT)", color: "text-gold" },
  ton: { icon: Wallet, emoji: "💎", label: "TON Wallet", color: "text-blue-400" },
  telegram_stars: { icon: Star, emoji: "⭐", label: "Estrellas de Telegram", color: "text-yellow-400" },
};

export default function PaymentsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [savingPlans, setSavingPlans] = useState(false);
  const [savingGifts, setSavingGifts] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadCreators(), loadPlans(), loadGifts()]);
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("payment_settings").select("*").order("created_at");
    setSettings(data || []);
    setLoading(false);
  };

  const loadCreators = async () => {
    const { data } = await supabase.from("creators").select("id, name, username");
    setCreators(data || []);
  };

  const loadPlans = async () => {
    const { data } = await supabase.from("subscription_plans").select("*").order("creator_id").order("duration_months");
    setPlans(data || []);
  };

  const loadGifts = async () => {
    const { data } = await supabase.from("gift_items").select("*").order("sort_order");
    setGifts(data || []);
  };

  const toggleProvider = async (provider: string, enabled: boolean) => {
    await supabase.from("payment_settings").update({ is_enabled: enabled }).eq("provider", provider);
    setSettings(prev => prev.map(s => s.provider === provider ? { ...s, is_enabled: enabled } : s));
    toast.success(`${providerMeta[provider]?.label} ${enabled ? "activado ✅" : "desactivado"}`);
  };

  const updateConfig = (provider: string, key: string, value: string) => {
    setSettings(prev => prev.map(s => {
      if (s.provider !== provider) return s;
      const config = typeof s.config === "object" ? { ...s.config } : {};
      config[key] = value;
      return { ...s, config };
    }));
  };

  const saveConfig = async (provider: string) => {
    setSaving(provider);
    const setting = settings.find(s => s.provider === provider);
    if (!setting) return;
    const { error } = await supabase.from("payment_settings").update({ config: setting.config }).eq("provider", provider);
    if (error) toast.error(error.message);
    else toast.success("Configuración guardada ✅");
    setSaving(null);
  };

  const testPayment = async (provider: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: { action: "create_link", provider, amount: provider === "ton" ? 0.5 : provider === "binance" ? 5 : 10000, purpose: "test" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Link de pago generado ✅");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ===== PLANS MANAGEMENT =====
  const updatePlan = (id: string, field: string, value: any) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addPlan = (creatorId: string) => {
    setPlans(prev => [...prev, { id: `new_${Date.now()}`, creator_id: creatorId, name: "Nuevo Plan", duration_months: 1, price: 10, currency: "USD", is_active: true, _isNew: true }]);
  };

  const deletePlan = async (id: string) => {
    if (id.startsWith("new_")) {
      setPlans(prev => prev.filter(p => p.id !== id));
      return;
    }
    await supabase.from("subscription_plans").delete().eq("id", id);
    setPlans(prev => prev.filter(p => p.id !== id));
    toast.success("Plan eliminado");
  };

  const savePlans = async () => {
    setSavingPlans(true);
    try {
      for (const plan of plans) {
        if (plan._isNew) {
          const { _isNew, id, ...rest } = plan;
          await supabase.from("subscription_plans").insert(rest);
        } else {
          const { id, created_at, updated_at, ...rest } = plan;
          await supabase.from("subscription_plans").update(rest).eq("id", id);
        }
      }
      await loadPlans();
      toast.success("Planes guardados ✅");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingPlans(false);
  };

  // ===== GIFTS MANAGEMENT =====
  const updateGift = (id: string, field: string, value: any) => {
    setGifts(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const addGift = () => {
    setGifts(prev => [...prev, { id: `new_${Date.now()}`, name: "Nuevo Regalo", emoji: "🎁", price: 10, currency: "USD", is_active: true, sort_order: prev.length + 1, _isNew: true }]);
  };

  const deleteGift = async (id: string) => {
    if (id.startsWith("new_")) {
      setGifts(prev => prev.filter(g => g.id !== id));
      return;
    }
    await supabase.from("gift_items").delete().eq("id", id);
    setGifts(prev => prev.filter(g => g.id !== id));
    toast.success("Regalo eliminado");
  };

  const saveGifts = async () => {
    setSavingGifts(true);
    try {
      for (const gift of gifts) {
        if (gift._isNew) {
          const { _isNew, id, ...rest } = gift;
          await supabase.from("gift_items").insert(rest);
        } else {
          const { id, created_at, ...rest } = gift;
          await supabase.from("gift_items").update(rest).eq("id", id);
        }
      }
      await loadGifts();
      toast.success("Regalos guardados ✅");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingGifts(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">💰 Métodos de Pago</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configuración centralizada para todas las creadoras</p>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="providers">💳 Proveedores</TabsTrigger>
          <TabsTrigger value="plans">👑 Planes</TabsTrigger>
          <TabsTrigger value="gifts">🎁 Regalos</TabsTrigger>
        </TabsList>

        {/* ===== PROVIDERS TAB ===== */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map(s => {
              const meta = providerMeta[s.provider] || { icon: CreditCard, emoji: "💳", label: s.provider, color: "text-primary" };
              const Icon = meta.icon;
              const config = typeof s.config === "object" ? s.config : {};

              return (
                <div key={s.id} className={`glass rounded-2xl p-5 border ${s.is_enabled ? "border-primary/40" : "border-border"} transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.is_enabled ? "gradient-primary" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${s.is_enabled ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{meta.emoji} {meta.label}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {s.is_enabled ? (
                            <><CheckCircle className="w-3 h-3 text-emerald" /><span className="text-xs text-emerald">Activo</span></>
                          ) : (
                            <><XCircle className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Inactivo</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch checked={s.is_enabled} onCheckedChange={v => toggleProvider(s.provider, v)} />
                  </div>

                  {s.is_enabled && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      {s.provider === "wompi" && (
                        <>
                          <div><Label className="text-xs">Moneda</Label><Input value={config.currency || "COP"} onChange={e => updateConfig("wompi", "currency", e.target.value)} className="bg-muted border-border text-sm" /></div>
                          <div><Label className="text-xs">Descripción</Label><Input value={config.description || ""} onChange={e => updateConfig("wompi", "description", e.target.value)} className="bg-muted border-border text-sm" /></div>
                          <p className="text-xs text-muted-foreground">🔑 Keys configuradas en secrets del backend</p>
                        </>
                      )}
                      {s.provider === "binance" && (
                        <>
                          <div><Label className="text-xs">Moneda crypto</Label><Input value={config.currency || "USDT"} onChange={e => updateConfig("binance", "currency", e.target.value)} className="bg-muted border-border text-sm" /></div>
                          <p className="text-xs text-muted-foreground">🔑 API Key y Merchant ID en secrets del backend</p>
                          <p className="text-xs text-muted-foreground">Soporta: USDT, BTC, ETH, BNB y más</p>
                        </>
                      )}
                      {s.provider === "ton" && (
                        <div><Label className="text-xs">Wallet Address</Label><Input value={config.wallet_address || ""} onChange={e => updateConfig("ton", "wallet_address", e.target.value)} placeholder="UQ..." className="bg-muted border-border text-sm" /></div>
                      )}
                      {s.provider === "telegram_stars" && (
                        <p className="text-xs text-muted-foreground">⭐ Las estrellas de Telegram funcionan automáticamente con el bot de cada creadora.</p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => saveConfig(s.provider)} disabled={saving === s.provider} className="gradient-primary text-white glow-rose text-xs">
                          {saving === s.provider ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                          Guardar
                        </Button>
                        {s.provider !== "telegram_stars" && (
                          <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => testPayment(s.provider)}>
                            🧪 Test
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== PLANS TAB ===== */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Planes de suscripción al canal VIP por creadora</p>
            <Button size="sm" onClick={savePlans} disabled={savingPlans} className="gradient-primary text-white text-xs">
              {savingPlans ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Guardar Planes
            </Button>
          </div>

          {creators.map(c => {
            const creatorPlans = plans.filter(p => p.creator_id === c.id);
            return (
              <div key={c.id} className="glass rounded-2xl p-5 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-gold" />
                    <h3 className="font-display font-bold text-foreground">{c.name}</h3>
                    <span className="text-xs text-muted-foreground">@{c.username}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addPlan(c.id)} className="text-xs border-border">
                    <Plus className="w-3 h-3 mr-1" /> Plan
                  </Button>
                </div>

                <div className="space-y-3">
                  {creatorPlans.map(p => (
                    <div key={p.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Nombre</Label>
                          <Input value={p.name} onChange={e => updatePlan(p.id, "name", e.target.value)} className="bg-background border-border text-sm h-8" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Meses</Label>
                          <Input type="number" value={p.duration_months} onChange={e => updatePlan(p.id, "duration_months", parseInt(e.target.value) || 1)} className="bg-background border-border text-sm h-8" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Precio</Label>
                          <Input type="number" value={p.price} onChange={e => updatePlan(p.id, "price", parseFloat(e.target.value) || 0)} className="bg-background border-border text-sm h-8" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Moneda</Label>
                          <Input value={p.currency} onChange={e => updatePlan(p.id, "currency", e.target.value)} className="bg-background border-border text-sm h-8" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.is_active} onCheckedChange={v => updatePlan(p.id, "is_active", v)} />
                        <Button size="icon" variant="ghost" onClick={() => deletePlan(p.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {creatorPlans.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Sin planes configurados</p>}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ===== GIFTS TAB ===== */}
        <TabsContent value="gifts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Regalos que los fans pueden enviar a las creadoras</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addGift} className="text-xs border-border">
                <Plus className="w-3 h-3 mr-1" /> Agregar regalo
              </Button>
              <Button size="sm" onClick={saveGifts} disabled={savingGifts} className="gradient-primary text-white text-xs">
                {savingGifts ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                Guardar
              </Button>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {gifts.map(g => (
                <div key={g.id} className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="flex items-center gap-1">
                      <Switch checked={g.is_active} onCheckedChange={v => updateGift(g.id, "is_active", v)} />
                      <Button size="icon" variant="ghost" onClick={() => deleteGift(g.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nombre</Label>
                      <Input value={g.name} onChange={e => updateGift(g.id, "name", e.target.value)} className="bg-background border-border text-sm h-8" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Emoji</Label>
                      <Input value={g.emoji} onChange={e => updateGift(g.id, "emoji", e.target.value)} className="bg-background border-border text-sm h-8" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Precio</Label>
                      <Input type="number" value={g.price} onChange={e => updateGift(g.id, "price", parseFloat(e.target.value) || 0)} className="bg-background border-border text-sm h-8" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Moneda</Label>
                      <Input value={g.currency} onChange={e => updateGift(g.id, "currency", e.target.value)} className="bg-background border-border text-sm h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {gifts.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Sin regalos configurados</p>}
          </div>
        </TabsContent>
      </Tabs>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display font-bold text-foreground mb-3">📋 Cómo funcionan</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>👑 <strong>Suscripciones:</strong> El fan elige entre los planes configurados. Al pagar, se le da acceso al canal VIP.</p>
          <p>🎁 <strong>Regalos:</strong> Los fans pueden enviar regalos con valor monetario a las creadoras.</p>
          <p>💳 <strong>Propinas:</strong> Los fans pueden enviar una propina del valor que deseen.</p>
          <p className="text-xs mt-3">💡 Los botones aparecen automáticamente en el chat de Telegram cuando un fan solicita suscripción, contenido VIP, propinas o regalos.</p>
        </div>
      </div>
    </div>
  );
}
