import { supabase } from "@/integrations/supabase/client";
import { Users, MessageCircle, TrendingUp, Heart, DollarSign } from "lucide-react";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import ConversationList from "@/components/fans/ConversationList";
import ChatPanel from "@/components/fans/ChatPanel";
import FansTable from "@/components/fans/FansTable";
import { useState } from "react";

interface Conversation {
  id: string;
  message_count: number;
  fans: { first_name: string | null; telegram_username: string | null } | null;
  creators: { name: string } | null;
}

interface Fan {
  id: string;
  first_name: string | null;
  telegram_username: string | null;
  last_active_at: string;
  is_subscriber: boolean;
  total_spent: number;
  relationship_level: number;
  creators: { name: string; avatar_url: string | null } | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  sent_at: string;
  media_url: string | null;
}

export default function FansPage() {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: fans, loading: fansLoading } = useSupabaseQuery<Fan[]>([], async () => {
    const { data } = await supabase.from("fans").select("*, creators(name, avatar_url)").order("last_active_at", { ascending: false }).limit(50);
    return (data || []) as Fan[];
  });

  const { data: conversations, loading: convLoading } = useSupabaseQuery<Conversation[]>([], async () => {
    const { data } = await supabase.from("conversations").select("*, fans(first_name, telegram_username), creators(name)").order("last_message_at", { ascending: false }).limit(20);
    return (data || []) as Conversation[];
  });

  const loading = fansLoading || convLoading;

  const selectConv = async (conv: Conversation) => {
    setSelected(conv);
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("sent_at", { ascending: true }).limit(100);
    setMessages((data || []) as Message[]);
  };

  const stats = [
    { label: "Total fans", value: fans.length, icon: Users },
    { label: "Activos hoy", value: fans.filter(f => Date.now() - new Date(f.last_active_at).getTime() < 86400000).length, icon: TrendingUp },
    { label: "Suscriptores", value: fans.filter(f => f.is_subscriber).length, icon: Heart },
    { label: "Gasto total", value: `$${fans.reduce((a, f) => a + (f.total_spent || 0), 0).toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Fans & Conversaciones" description="Usuarios y sus conversaciones con la IA" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px] md:h-[500px]">
        <ConversationList
          conversations={conversations}
          loading={loading}
          selectedId={selected?.id || null}
          onSelect={selectConv}
        />
        <ChatPanel selected={selected} messages={messages} />
      </div>

      <FansTable fans={fans} loading={loading} />
    </div>
  );
}
