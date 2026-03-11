import { MessageCircle } from "lucide-react";
import miaAvatar from "@/assets/mia-avatar.jpg";

interface Conversation {
  id: string;
  message_count: number;
  fans: { first_name: string | null; telegram_username: string | null } | null;
  creators: { name: string } | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  sent_at: string;
  media_url: string | null;
}

interface Props {
  selected: Conversation | null;
  messages: Message[];
}

export default function ChatPanel({ selected, messages }: Props) {
  if (!selected) {
    return (
      <div className="glass rounded-2xl overflow-hidden flex flex-col md:col-span-2">
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Selecciona una conversación</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col md:col-span-2">
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
    </div>
  );
}
