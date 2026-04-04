import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
}

export function StatsCard({ title, value, subtitle, icon: Icon }: StatsCardProps) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-accent-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <p className="text-3xl font-semibold text-foreground tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
