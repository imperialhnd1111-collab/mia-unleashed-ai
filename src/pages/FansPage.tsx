import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageCircle, TrendingUp, Heart, DollarSign } from "lucide-react";
import miaAvatar from "@/assets/mia-avatar.jpg";

export default function FansPage() {
  const [fans, setFans] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const load = async () => {
    const [{ data: f }, { data: conv }] = await Promise.all([
      supabase.from("fans").select("*, creators(name, avatar_url)").order("last_active_at", { ascending: false }).limit(50),
      supabase.from("conversations").select("*, fans(first_name, telegram_username), creators(name)").order("last_message_at", { ascending: false }).limit(20),
    ]);
    setFans(f || []);
    setConversations(conv || []);
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("sent_at", { ascending: true }).limit(100);
    setMessages(data || []);
  };

  useEffect(() => { load(); }, []);

  const selectConv = (conv: any) => { setSelected(conv); loadMessages(conv.id); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Fans & Conversaciones</h1>
        <p className="text-muted-foreground mt-1 text-sm">Usuarios y sus conversaciones con la IA</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total fans", value: fans.length, icon: Users },
          { label: "Activos hoy", value: fans.filter(f => Date.now() - new Date(f.last_active_at).getTime() < 86400000).length, icon: TrendingUp },
          { label: "Suscriptores", value: fans.filter(f => f.is_subscriber).length, icon: Heart },
          { label: "Gasto total", value: `$${fans.reduce((a, f) => a + (f.total_spent || 0), 0).toFixed(2)}`, icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-3 flex items-center gap-3">
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

      {/* Chat area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px] md:h-[500px]">
        <div className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Conversaciones</h3>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Cargando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />Sin conversaciones
              </div>
            ) : conversations.map(conv => (
              <button key={conv.id} onClick={() => selectConv(conv)} className={`w-full text-left p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${selected?.id === conv.id ? "bg-secondary" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(conv.fans?.first_name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{conv.fans?.first_name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">{conv.message_count} msgs</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden flex flex-col md:col-span-2">
          {selected ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                  {(selected.fans?.first_name || "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{selected.fans?.first_name || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">{selected.message_count} msgs · {selected.creators?.name}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">Sin mensajes</div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                    {msg.role === "assistant" && <img src={miaAvatar} alt="AI" className="w-6 h-6 rounded-full object-cover mr-2 self-end shrink-0" />}
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-secondary text-foreground" : "gradient-primary text-white"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Selecciona una conversación</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Fans table - responsive */}
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Todos los fans</h2>
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Creadora</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Nivel</th>
                <th className="px-4 py-3 text-left">Gasto</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Último activo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
              ) : fans.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin fans aún</td></tr>
              ) : fans.map(fan => (
                <tr key={fan.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs shrink-0">{(fan.first_name || "?")[0]?.toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{fan.first_name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{fan.telegram_username ? `@${fan.telegram_username}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{fan.creators?.name || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">Lv {fan.relationship_level}</span></td>
                  <td className="px-4 py-3 text-gold font-medium">${fan.total_spent || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{new Date(fan.last_active_at).toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
