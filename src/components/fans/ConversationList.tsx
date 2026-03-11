import { MessageCircle } from "lucide-react";

interface Conversation {
  id: string;
  message_count: number;
  fans: { first_name: string | null; telegram_username: string | null } | null;
  creators: { name: string } | null;
}

interface Props {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
}

export default function ConversationList({ conversations, loading, selectedId, onSelect }: Props) {
  return (
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
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full text-left p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${selectedId === conv.id ? "bg-secondary" : ""}`}
          >
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
  );
}
