import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export default function LoadingState({ message = "Cargando...", fullPage = false }: LoadingStateProps) {
  if (fullPage) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="text-center text-muted-foreground py-12">{message}</div>
  );
}
