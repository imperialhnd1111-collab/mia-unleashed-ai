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

interface Props {
  fans: Fan[];
  loading: boolean;
}

export default function FansTable({ fans, loading }: Props) {
  return (
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
                    <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs shrink-0">
                      {(fan.first_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">{fan.first_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{fan.telegram_username ? `@${fan.telegram_username}` : ""}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{fan.creators?.name || "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">Lv {fan.relationship_level}</span>
                </td>
                <td className="px-4 py-3 text-gold font-medium">${fan.total_spent || 0}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                  {new Date(fan.last_active_at).toLocaleDateString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
