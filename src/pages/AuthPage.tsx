import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Sparkles } from "lucide-react";
import miaAvatar from "@/assets/mia-avatar.jpg";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const mode = "login";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bienvenido al sistema 🔥");
    } catch (error: any) {
      toast.error(error.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(345 85% 55%) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo area */}
        <div className="text-center mb-8 slide-in">
          <div className="relative inline-block mb-4">
            <img src={miaAvatar} alt="Mia" className="w-20 h-20 rounded-full object-cover border-2 border-primary glow-rose mx-auto" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-1">Creator AI</h1>
          <p className="text-muted-foreground text-sm">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-card slide-in">
          <h2 className="text-xl font-semibold text-foreground mb-1">Iniciar Sesión</h2>
          <p className="text-muted-foreground text-sm mb-6">Accede al sistema de gestión</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@creator.ai"
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white font-semibold py-2.5 rounded-lg glow-rose hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
              ) : "Entrar al sistema"}
            </Button>
          </form>

          {/* Admin only - no signup */}
        </div>
      </div>
    </div>
  );
}
