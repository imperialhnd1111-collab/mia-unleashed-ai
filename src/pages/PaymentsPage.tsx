import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Wallet, Star, Coins, Save, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const providerMeta: Record<string, { icon: any; emoji: string; label: string; color: string }> = {
  wompi: { icon: CreditCard, emoji: "💳", label: "Wompi (Nequi, PSE, Tarjeta)", color: "text-emerald" },
  binance: { icon: Coins, emoji: "🪙", label: "Binance Pay (Crypto)", color: "text-gold" },
  ton: { icon: Wallet, emoji: "💎", label: "TON Wallet", color: "text-blue-400" },
  telegram_stars: { icon: Star, emoji: "⭐", label: "Estrellas de Telegram", color: "text-yellow-400" },
};

export default function PaymentsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("payment_settings").select("*").order("created_at");
    setSettings(data || []);
    setLoading(false);
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">💰 Métodos de Pago</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configuración centralizada para todas las creadoras</p>
      </div>

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
                    </>
                  )}
                  {s.provider === "ton" && (
                    <div><Label className="text-xs">Wallet Address</Label><Input value={config.wallet_address || ""} onChange={e => updateConfig("ton", "wallet_address", e.target.value)} placeholder="UQ..." className="bg-muted border-border text-sm" /></div>
                  )}
                  {s.provider === "telegram_stars" && (
                    <p className="text-xs text-muted-foreground">⭐ Las estrellas de Telegram funcionan automáticamente con el bot de cada creadora. No requiere configuración adicional.</p>
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

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display font-bold text-foreground mb-3">📋 Cómo funcionan los pagos</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>💳 <strong>Wompi:</strong> Nequi, PSE, tarjetas. Se genera un link de pago automático en el chat.</p>
          <p>🪙 <strong>Binance Pay:</strong> Pago cripto (USDT, BTC, etc). Se genera order via API.</p>
          <p>💎 <strong>TON:</strong> Pago directo a wallet TON. Se genera deep link.</p>
          <p>⭐ <strong>Telegram Stars:</strong> Sistema nativo. Se envía factura inline en el chat.</p>
          <p className="text-xs mt-3">💡 Los botones de pago y propina aparecen automáticamente cuando un fan solicita suscripción, contenido VIP o propinas en el chat.</p>
        </div>
      </div>
    </div>
  );
}
