import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, BarChart3, Calendar, CreditCard, Users, ArrowRight, Star } from "lucide-react";
import miaAvatar from "@/assets/mia-avatar.jpg";

const features = [
  { icon: Bot, title: "IA Personalizada", desc: "Clona tu personalidad con IA que chatea 24/7 por ti" },
  { icon: Users, title: "Gestión de Fans", desc: "CRM inteligente con perfiles, suscripciones y engagement" },
  { icon: CreditCard, title: "Monetización", desc: "Suscripciones, propinas, regalos con múltiples métodos de pago" },
  { icon: Calendar, title: "Plan de Contenido", desc: "Calendario IA que genera tu estrategia mensual completa" },
  { icon: BarChart3, title: "Analytics", desc: "Métricas en tiempo real de ingresos, fans y conversiones" },
  { icon: Sparkles, title: "Canal Automático", desc: "Publicación automática en canales de Telegram" },
];

const plans = [
  { name: "Creadora", price: "Gratis", desc: "15% de comisión sobre ganancias", highlight: false },
  { name: "Agencia", price: "Gratis", desc: "15% de comisión · Múltiples creadoras", highlight: true },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={miaAvatar} alt="Creator AI" className="w-8 h-8 rounded-full object-cover border border-primary/50" />
            <span className="font-display font-bold text-lg text-gradient">Creator AI</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground">
              Admin
            </Button>
            <Button size="sm" onClick={() => navigate("/register")} className="gradient-primary text-white glow-rose">
              Comenzar gratis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, hsl(345 85% 55%) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 slide-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6 text-sm text-primary">
            <Star className="w-3.5 h-3.5" /> Plataforma #1 para creadoras con IA
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-5 leading-tight">
            Tu clon de IA que <span className="text-gradient">monetiza</span> por ti 24/7
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Conecta tu bot de Telegram, entrena tu IA con tu personalidad y deja que chatee, venda y fidelice a tus fans automáticamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/register")} className="gradient-primary text-white text-lg px-8 glow-rose hover:opacity-90 transition-opacity">
              Crear mi clon IA <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Sin tarjeta de crédito · Solo pagamos por resultados (15%)</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="glass rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all group">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-display font-bold mb-3">Simple y justo</h2>
          <p className="text-muted-foreground mb-10">No cobramos mensualidades. Solo ganamos cuando tú ganas.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {plans.map((p, i) => (
              <div key={i} className={`rounded-xl p-6 border ${p.highlight ? "border-primary/50 bg-primary/5" : "border-border/50 glass"}`}>
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <div className="text-3xl font-display font-bold text-gradient mb-2">{p.price}</div>
                <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                <Button onClick={() => navigate("/register")} className={p.highlight ? "gradient-primary text-white w-full" : "w-full"} variant={p.highlight ? "default" : "outline"}>
                  Comenzar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Creator AI · Potenciado con IA
      </footer>
    </div>
  );
}
