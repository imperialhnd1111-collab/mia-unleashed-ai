import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, Gift, Plus, Trash2, Save, Loader2 } from "lucide-react";

interface Props {
  creator: any;
  onUpdate: () => void;
}

export default function CreatorPricing({ creator, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [subPrice, setSubPrice] = useState(creator.subscription_price || 0);

  // Subscription plans
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Gift items
  const [gifts, setGifts] = useState<any[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);

  useEffect(() => {
    loadPlans();
    loadGifts();
  }, [creator.id]);

  const loadPlans = async () => {
    const { data } = await supabase.from("subscription_plans").select("*").eq("creator_id", creator.id).order("duration_months");
    setPlans(data || []);
    setLoadingPlans(false);
  };

  const loadGifts = async () => {
    const { data } = await supabase.from("gift_items").select("*").order("sort_order");
    setGifts(data || []);
    setLoadingGifts(false);
  };

  const addPlan = async () => {
    const { error } = await supabase.from("subscription_plans").insert({
      creator_id: creator.id,
      name: "Nuevo Plan",
      price: 10,
      duration_months: 1,
    });
    if (error) { toast.error("Error al crear plan"); return; }
    toast.success("Plan creado");
    loadPlans();
  };

  const updatePlan = async (id: string, updates: any) => {
    await supabase.from("subscription_plans").update(updates).eq("id", id);
    loadPlans();
  };

  const deletePlan = async (id: string) => {
    await supabase.from("subscription_plans").delete().eq("id", id);
    toast.success("Plan eliminado");
    loadPlans();
  };

  const saveSubPrice = async () => {
    setSaving(true);
    const { error } = await supabase.from("creators").update({ subscription_price: subPrice }).eq("id", creator.id);
    if (error) toast.error("Error");
    else { toast.success("Precio base guardado"); onUpdate(); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">Precios y Monetización</h2>
          <p className="text-xs text-muted-foreground">Configura tus suscripciones y regalos</p>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="glass rounded-xl p-5 border border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">💎 Planes de Suscripción</h3>
          <Button size="sm" variant="outline" onClick={addPlan} className="border-border text-xs">
            <Plus className="w-3 h-3 mr-1" /> Agregar Plan
          </Button>
        </div>

        <div className="glass rounded-lg p-3 border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-muted-foreground">💰 La plataforma cobra una comisión del <strong className="text-primary">15%</strong> sobre cada transacción.</p>
        </div>

        {loadingPlans ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tienes planes aún. ¡Crea uno!</p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={plan.name}
                      onChange={e => updatePlan(plan.id, { name: e.target.value })}
                      className="bg-muted border-border h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio (USD)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={plan.price}
                      onChange={e => updatePlan(plan.id, { price: parseFloat(e.target.value) || 0 })}
                      className="bg-muted border-border h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duración (meses)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={plan.duration_months}
                      onChange={e => updatePlan(plan.id, { duration_months: parseInt(e.target.value) || 1 })}
                      className="bg-muted border-border h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={v => updatePlan(plan.id, { is_active: v })}
                    />
                    <span className="text-xs text-muted-foreground">{plan.is_active ? "Activo" : "Inactivo"}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deletePlan(plan.id)} className="text-destructive hover:text-destructive h-7 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gift Items */}
      <div className="glass rounded-xl p-5 border border-border/50 space-y-4">
        <h3 className="font-semibold text-sm">🎁 Regalos y Propinas</h3>
        <p className="text-xs text-muted-foreground">Los regalos se configuran globalmente por el administrador. Aquí puedes ver los disponibles:</p>

        {loadingGifts ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : gifts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay regalos configurados</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {gifts.filter(g => g.is_active).map((gift) => (
              <div key={gift.id} className="p-3 rounded-lg border border-border/50 bg-muted/30 text-center">
                <span className="text-2xl">{gift.emoji}</span>
                <p className="text-xs font-medium mt-1">{gift.name}</p>
                <p className="text-xs text-primary font-bold">${gift.price} USD</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Base subscription price */}
      <div className="glass rounded-xl p-5 border border-border/50 space-y-3">
        <h3 className="font-semibold text-sm">⭐ Precio base de suscripción</h3>
        <div className="flex items-center gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Precio mensual (USD)</Label>
            <Input
              type="number"
              min={0}
              value={subPrice}
              onChange={e => setSubPrice(parseFloat(e.target.value) || 0)}
              className="bg-muted border-border"
            />
          </div>
          <Button onClick={saveSubPrice} disabled={saving} size="sm" className="gradient-primary text-white mt-4">
            <Save className="w-3 h-3 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
