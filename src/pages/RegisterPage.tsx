import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import miaAvatar from "@/assets/mia-avatar.jpg";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar sesión con Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(345 85% 55%) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="text-center mb-8 slide-in">
          <div className="relative inline-block mb-4">
            <img src={miaAvatar} alt="Creator AI" className="w-16 h-16 rounded-full object-cover border-2 border-primary glow-rose mx-auto" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-gradient mb-1">Únete a Creator AI</h1>
          <p className="text-muted-foreground text-sm">Crea tu clon de IA y comienza a monetizar</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-card slide-in space-y-4">
          <Button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-white/90 text-gray-800 font-medium py-3 rounded-lg flex items-center justify-center gap-3 transition-all"
            variant="outline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Conectando..." : "Continuar con Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">o</span></div>
          </div>

          <Button
            variant="outline"
            disabled
            className="w-full py-3 rounded-lg flex items-center justify-center gap-3 opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Telegram (próximamente)
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Al registrarte aceptas que cobraremos el 15% de tus ganancias generadas.
          </p>
        </div>
      </div>
    </div>
  );
}
