import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Radio, Clock, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChannelPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [form, setForm] = useState({ creator_id: "", caption: "", media_url: "", post_type: "text", scheduled_at: "" });

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("creators").select("id, name, telegram_channel_id, telegram_bot_token"),
      supabase.from("channel_posts").select("*, creators(name)").order("scheduled_at", { ascending: true }),
    ]);
    setCreators(c || []);
    setPosts(p || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.creator_id || !form.caption) return toast.error("Completa los campos");
    try {
      const { error } = await supabase.from("channel_posts").insert([{
        creator_id: form.creator_id, caption: form.caption, media_url: form.media_url || null,
        post_type: form.post_type as any, status: "scheduled",
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success("Post programado ✅");
      setShowForm(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const publishNow = async (post: any) => {
    setPublishing(post.id);
    try {
      const creator = creators.find((c: any) => c.id === post.creator_id);
      if (!creator?.telegram_bot_token || !creator?.telegram_channel_id) return toast.error("Configura token y canal ID");
      const res = await fetch(`https://api.telegram.org/bot${creator.telegram_bot_token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: creator.telegram_channel_id, text: post.caption, parse_mode: "HTML" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description);
      await supabase.from("channel_posts").update({ status: "published", published_at: new Date().toISOString(), telegram_message_id: String(data.result.message_id) }).eq("id", post.id);
      toast.success("Publicado ✅");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setPublishing(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Canal de Telegram</h1>
          <p className="text-muted-foreground mt-1 text-sm">Programa y publica posts en el canal</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-white glow-rose w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nuevo post
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scheduled */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-semibold text-foreground">Programados</h3>
            <span className="ml-auto text-xs bg-gold/15 text-gold px-2 py-0.5 rounded-full">{posts.filter((p: any) => p.status === "scheduled").length}</span>
          </div>
          <div className="space-y-3">
            {posts.filter((p: any) => p.status === "scheduled").map((post: any) => (
              <div key={post.id} className="bg-secondary rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{post.creators?.name} · {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("es-CO") : "Ahora"}</p>
                <p className="text-sm text-foreground line-clamp-3">{post.caption}</p>
                <button onClick={() => publishNow(post)} disabled={publishing === post.id} className="mt-2 w-full text-xs gradient-primary text-white rounded-lg py-1.5 flex items-center justify-center gap-1">
                  <Send className="w-3 h-3" /> {publishing === post.id ? "Publicando..." : "Publicar ahora"}
                </button>
              </div>
            ))}
            {posts.filter((p: any) => p.status === "scheduled").length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin programados</p>}
          </div>
        </div>

        {/* Published */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-semibold text-foreground">Publicados</h3>
            <span className="ml-auto text-xs bg-emerald/15 text-emerald px-2 py-0.5 rounded-full">{posts.filter((p: any) => p.status === "published").length}</span>
          </div>
          <div className="space-y-3">
            {posts.filter((p: any) => p.status === "published").map((post: any) => (
              <div key={post.id} className="bg-secondary rounded-xl p-3">
                <p className="text-xs text-emerald mb-1">✅ {post.published_at ? new Date(post.published_at).toLocaleString("es-CO") : "Publicado"}</p>
                <p className="text-sm text-foreground line-clamp-2">{post.caption}</p>
              </div>
            ))}
            {posts.filter((p: any) => p.status === "published").length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin publicados</p>}
          </div>
        </div>

        {/* Ideas */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Ideas</h3>
          </div>
          <div className="space-y-2">
            {[
              "☀️ Buenos días! Empezando con energía y café ☕",
              "🏋️ Hoy fue piernas en el gym y ya no puedo caminar 💀",
              "📸 Sesión nueva y quedé 🔥",
              "🌙 Noches tranquilas... alguien más así? 🤍",
              "💅 Día de consentirme, uñas y Netflix",
            ].map((idea, i) => (
              <button key={i} onClick={() => { setForm(f => ({ ...f, caption: idea })); setShowForm(true); }} className="w-full text-left bg-secondary hover:bg-primary/10 rounded-lg p-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors">{idea}</button>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="glass rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto p-4 md:p-6 slide-in">
            <h2 className="text-xl font-display font-bold text-foreground mb-4">Nuevo post</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Creadora</Label>
                <Select value={form.creator_id} onValueChange={v => setForm(f => ({ ...f, creator_id: v }))}><SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{creators.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo</Label>
                <Select value={form.post_type} onValueChange={v => setForm(f => ({ ...f, post_type: v }))}><SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">📝 Texto</SelectItem><SelectItem value="photo">📸 Foto</SelectItem><SelectItem value="video">🎬 Video</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label className="text-sm">Texto *</Label><Textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} className="bg-muted border-border min-h-24" /></div>
              {form.post_type !== "text" && (
                <div className="space-y-1.5"><Label className="text-sm">URL del media</Label><Input value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} className="bg-muted border-border" /></div>
              )}
              <div className="space-y-1.5"><Label className="text-sm">Programar</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="bg-muted border-border" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-white glow-rose">Programar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-border">Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
