import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Upload, Image, Video, Lock, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContentItem {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  content_type: string;
  file_url: string;
  thumbnail_url: string;
  is_premium: boolean;
  price: number;
  status: string;
  scheduled_at: string;
  tags: string[];
  creators?: { name: string; avatar_url: string };
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    creator_id: "",
    title: "",
    description: "",
    content_type: "photo",
    file_url: "",
    thumbnail_url: "",
    is_premium: false,
    price: 0,
    status: "draft",
    scheduled_at: "",
    tags: "",
  });

  const load = async () => {
    const [{ data: c }, { data: items }] = await Promise.all([
      supabase.from("creators").select("id, name, avatar_url"),
      supabase.from("content_items").select("*, creators(name, avatar_url)").order("created_at", { ascending: false }),
    ]);
    setCreators(c || []);
    setItems(items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.creator_id) return toast.error("Selecciona una creadora");
    if (!form.title) return toast.error("Agrega un título");
    try {
      const { error } = await supabase.from("content_items").insert([{
        creator_id: form.creator_id,
        title: form.title,
        description: form.description,
        content_type: form.content_type as "photo" | "video" | "audio" | "text",
        file_url: form.file_url,
        thumbnail_url: form.thumbnail_url,
        is_premium: form.is_premium,
        price: form.price,
        status: form.status as "draft" | "scheduled" | "published" | "failed",
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      }]);
      if (error) throw error;
      toast.success("Contenido agregado ✅");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const typeIcon = (type: string) => type === "video" ? "🎬" : type === "audio" ? "🎵" : "📸";
  const statusColor = (s: string) => s === "published" ? "text-emerald" : s === "scheduled" ? "text-gold" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contenido</h1>
          <p className="text-muted-foreground mt-1">Biblioteca de fotos, videos y audios</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-white glow-rose">
          <Plus className="w-4 h-4 mr-2" /> Subir contenido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {["Todos", "Foto", "Video", "Audio", "Premium"].map(f => (
          <button key={f} className="px-4 py-1.5 rounded-full text-sm glass hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground">
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay contenido aún. Sube tu primera foto o video.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="glass rounded-xl overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors">
              <div className="aspect-square bg-muted relative flex items-center justify-center">
                {item.thumbnail_url || item.file_url ? (
                  <img src={item.thumbnail_url || item.file_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{typeIcon(item.content_type)}</span>
                )}
                {item.is_premium && (
                  <div className="absolute top-2 right-2 gradient-primary rounded-full p-1">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-0.5">
                  <span className="text-xs text-white">{typeIcon(item.content_type)} {item.content_type}</span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground truncate">{item.title || "Sin título"}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${statusColor(item.status)}`}>{item.status}</span>
                  {item.is_premium && <span className="text-xs text-gold font-medium">${item.price}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin p-6 slide-in">
            <h2 className="text-xl font-display font-bold text-foreground mb-6">Subir contenido</h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Creadora</Label>
                <Select value={form.creator_id} onValueChange={v => setForm(f => ({ ...f, creator_id: v }))}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Selecciona una creadora" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo</Label>
                  <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">📸 Foto</SelectItem>
                      <SelectItem value="video">🎬 Video</SelectItem>
                      <SelectItem value="audio">🎵 Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Estado</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="scheduled">Programado</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Título</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-muted border-border" placeholder="Título del contenido" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Descripción / Caption</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-muted border-border" placeholder="Descripción..." />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">URL del archivo (foto/video/audio)</Label>
                <Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} className="bg-muted border-border" placeholder="https://..." />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1"><Calendar className="w-3 h-3" /> Programar para</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="bg-muted border-border" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (separados por coma)</Label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="bg-muted border-border" placeholder="gym, lifestyle, exclusivo" />
              </div>

              <div className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_premium} onCheckedChange={v => setForm(f => ({ ...f, is_premium: v }))} />
                  <Label className="text-sm"><Lock className="w-3 h-3 inline mr-1" /> Contenido premium (de pago)</Label>
                </div>
                {form.is_premium && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Precio (USD/COP)</Label>
                    <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))} className="bg-muted border-border" placeholder="0.00" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-white glow-rose">Guardar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-border">Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
