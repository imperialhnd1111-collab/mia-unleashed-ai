import { useState } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ContentPlanStrategy({ plan }: { plan: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-rose">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-foreground text-sm">Estrategia IA</h4>
            <p className="text-[10px] text-muted-foreground">Plan mensual personalizado</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="prose prose-sm prose-invert max-w-none text-foreground/90 pt-3 [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary/90 [&_strong]:text-foreground [&_li]:text-foreground/80 [&_p]:leading-relaxed text-xs">
            <ReactMarkdown>{plan}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
