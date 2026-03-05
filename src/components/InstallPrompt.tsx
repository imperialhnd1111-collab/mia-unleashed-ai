import { useState, useEffect } from "react";
import { Download, Smartphone, Shield, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import miaAvatar from "@/assets/mia-avatar.jpg";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden px-6">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(345 85% 55%) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-10"
          style={{ background: "linear-gradient(0deg, hsl(345 85% 40%), transparent)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="slide-in">
          <div className="relative inline-block mb-4">
            <img src={miaAvatar} alt="Creator AI" className="w-24 h-24 rounded-3xl object-cover border-2 border-primary glow-rose mx-auto shadow-lg" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-1">Creator AI</h1>
          <p className="text-muted-foreground text-sm">Panel de Administración</p>
        </div>

        {/* Features */}
        <div className="space-y-3 slide-in" style={{ animationDelay: "100ms" }}>
          {[
            { icon: Zap, label: "Acceso rápido", desc: "Abre directamente desde tu pantalla" },
            { icon: Shield, label: "Seguro", desc: "Datos protegidos con encriptación" },
            { icon: Smartphone, label: "Experiencia nativa", desc: "Funciona como app real" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 glass rounded-xl p-3 text-left">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Install button */}
        <div className="space-y-3 slide-in" style={{ animationDelay: "200ms" }}>
          {isIOS ? (
            <div className="glass rounded-2xl p-5 space-y-3">
              <Download className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-semibold text-foreground">Instalar en iPhone</p>
              <div className="text-xs text-muted-foreground space-y-2 text-left">
                <p>1. Toca el botón <strong className="text-foreground">Compartir</strong> (📤) en Safari</p>
                <p>2. Selecciona <strong className="text-foreground">"Agregar a pantalla de inicio"</strong></p>
                <p>3. Toca <strong className="text-foreground">"Agregar"</strong></p>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={installing || !deferredPrompt}
              className="w-full gradient-primary text-primary-foreground font-bold py-6 rounded-2xl glow-rose text-base hover:opacity-90 transition-opacity"
            >
              <Download className="w-5 h-5 mr-2" />
              {installing ? "Instalando..." : deferredPrompt ? "Descargar App" : "Preparando descarga..."}
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground">Descarga gratuita · No requiere App Store</p>
        </div>
      </div>
    </div>
  );
}
