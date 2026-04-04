import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down";
  icon: LucideIcon;
  index: number;
}

export function StatsCard({ title, value, change, changeType, icon: Icon, index }: StatsCardProps) {
  return (
    <div
      className="glass rounded-lg p-5 animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {change && (
          <span className={cn(
            "text-xs font-medium mb-1",
            changeType === "up" ? "text-success" : "text-destructive"
          )}>
            {changeType === "up" ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
    </div>
  );
}
