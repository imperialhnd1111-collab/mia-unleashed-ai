import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Sparkles, ImagePlus, Loader2, TrendingUp, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Props {
  creators: any[];
  onUseSuggestion: (caption: string) => void;
}

export default function ChannelAIPanel({ creators, onUseSuggestion }: Props) {
  const [creatorId, setCreatorId] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const analyze = async () => {
    if (!creatorId) return toast.error("Selecciona una creadora");
    setLoading(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("channel-ai", {
        body: { creator_id: creatorId, action: "analyze" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis || "Sin resultados");
    } catch (e: any) {
      toast.error(e.message || "Error al analizar");
    }
    setLoading(false);
  };

  const generateImage = async () => {
    if (!creatorId) return toast.error("Selecciona una creadora");
    setLoadingImage(true);
    setGeneratedImage(null);
    try {
      const { data, error } = await supabase.functions.invoke("channel-ai", {
        body: { creator_id: creatorId, action: "generate_image_prompt" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImagePrompt(data.prompt || "");
      setGeneratedImage(data.image || null);
      if (!data.image) toast.error("No se pudo generar la imagen");
    } catch (e: any) {
      toast.error(e.message || "Error al generar imagen");
    }
    setLoadingImage(false);
  };

  return (
    <div className="glass rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">🧠 Super Agente IA de Canal</h3>
          <p className="text-xs text-muted-foreground">Analiza, predice y genera contenido</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={creatorId} onValueChange={setCreatorId}>
          <SelectTrigger className="bg-muted border-border flex-1">
            <SelectValue placeholder="Selecciona creadora" />
          </SelectTrigger>
          <SelectContent>
            {creators.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={analyze} disabled={loading} size="sm" className="gradient-primary text-white glow-rose">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" />Analizar</>}
          </Button>
          <Button onClick={generateImage} disabled={loadingImage} size="sm" variant="outline" className="border-border">
            {loadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImagePlus className="w-4 h-4 mr-1" />Generar Imagen</>}
          </Button>
        </div>
      </div>

      {/* Generated Image */}
      {generatedImage && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">📸 Imagen generada por IA</h4>
          </div>
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={generatedImage} alt="AI generated" className="w-full max-h-72 object-cover" />
          </div>
          <p className="text-xs text-muted-foreground italic">Prompt: {imagePrompt}</p>
          <Button
            size="sm"
            variant="outline"
            className="border-border text-xs"
            onClick={() => {
              onUseSuggestion(`📸 Nueva foto del día ✨`);
              toast.success("Caption añadido, puedes adjuntar la imagen descargada");
            }}
          >
            Usar como post
          </Button>
        </div>
      )}

      {/* Analysis */}
      {analysis && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">📊 Análisis y Predicciones</h4>
          </div>
          <div className="bg-secondary/50 rounded-xl p-4 max-h-96 overflow-y-auto">
            <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>

          {/* Quick action buttons from analysis */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => {
              const lines = analysis.split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("•"));
              const suggestion = lines[0]?.replace(/^[-•]\s*/, "").trim() || "☀️ Nuevo post del día";
              onUseSuggestion(suggestion);
            }}>
              <Calendar className="w-3 h-3 mr-1" /> Usar primera sugerencia
            </Button>
            <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => generateImage()}>
              <ImagePlus className="w-3 h-3 mr-1" /> Generar imagen para post
            </Button>
          </div>
        </div>
      )}

      {!analysis && !generatedImage && !loading && !loadingImage && (
        <div className="text-center py-6 space-y-2">
          <div className="flex justify-center gap-3 text-muted-foreground/40">
            <TrendingUp className="w-6 h-6" />
            <MessageSquare className="w-6 h-6" />
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-xs text-muted-foreground">Selecciona una creadora y presiona <strong>Analizar</strong> para obtener predicciones, sugerencias de posts y estrategia de contenido</p>
        </div>
      )}
    </div>
  );
}
