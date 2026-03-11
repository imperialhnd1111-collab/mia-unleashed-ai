import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  className?: string;
}

export default function StatCard({ icon: Icon, label, value, sub, trend, className = "" }: StatCardProps) {
  return (
    <div className={`glass rounded-2xl p-4 slide-in ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-emerald bg-emerald/10 px-2 py-0.5 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}
