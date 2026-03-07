import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Save, Loader2 } from "lucide-react";

interface Props {
  creator: any;
  onUpdate: () => void;
}

export default function CreatorProfile({ creator, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: creator.name || "",
    username: creator.username || "",
    bio: creator.bio || "",
    avatar_url: creator.avatar_url || "",
    cover_url: creator.cover_url || "",
    backstory: creator.backstory || "",
    whatsapp_number: creator.whatsapp_number || "",
  });

  const handleSave = async () => {
    if (!form.name || !form.username) {
      toast.error("Nombre y username son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("creators").update({
        name: form.name,
        username: form.username.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        bio: form.bio,
        avatar_url: form.avatar_url || null,
        cover_url: form.cover_url || null,
        backstory: form.backstory || null,
        whatsapp_number: form.whatsapp_number || null,
      }).eq("id", creator.id);

      if (error) throw error;
      toast.success("Perfil actualizado ✅");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">Mi Perfil</h2>
          <p className="text-xs text-muted-foreground">Edita tu información pública</p>
        </div>
      </div>

      <div className="glass rounded-xl p-5 border border-border/50 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre artístico *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-muted border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Username *</Label>
            <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="bg-muted border-border" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Bio</Label>
          <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="bg-muted border-border min-h-[60px]" placeholder="Cuéntale al mundo sobre ti..." />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">URL de Avatar</Label>
          <Input value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} className="bg-muted border-border text-xs" placeholder="https://..." />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">URL de Portada</Label>
          <Input value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} className="bg-muted border-border text-xs" placeholder="https://..." />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Historia / Backstory</Label>
          <Textarea value={form.backstory} onChange={e => setForm({ ...form, backstory: e.target.value })} className="bg-muted border-border min-h-[80px]" placeholder="La historia detrás de tu personaje para que la IA la conozca..." />
          <p className="text-xs text-muted-foreground">Esta historia ayuda a que tu IA tenga más contexto y personalidad</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">WhatsApp (opcional)</Label>
          <Input value={form.whatsapp_number} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })} className="bg-muted border-border" placeholder="+57 300 123 4567" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-white glow-rose h-12">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {saving ? "Guardando..." : "Guardar Perfil"}
      </Button>
    </div>
  );
}
