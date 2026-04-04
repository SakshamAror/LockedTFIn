import { cn } from "@/lib/utils";
import { ShieldAlert, AlertTriangle, Mail } from "lucide-react";

interface FunnelLevel {
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

export function ImportanceFunnel({ emails }: { emails: { importance: string }[] }) {
  const levels: FunnelLevel[] = [
    {
      label: "Critical",
      count: emails.filter(e => e.importance === "critical").length,
      icon: ShieldAlert,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/15 border-destructive/25",
    },
    {
      label: "High",
      count: emails.filter(e => e.importance === "high").length,
      icon: AlertTriangle,
      colorClass: "text-warning",
      bgClass: "bg-warning/15 border-warning/25",
    },
    {
      label: "Medium",
      count: emails.filter(e => e.importance === "medium").length,
      icon: Mail,
      colorClass: "text-primary",
      bgClass: "bg-primary/15 border-primary/25",
    },
  ];

  const total = emails.length;

  return (
    <div className="glass rounded-lg p-5 animate-fade-in">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 font-display">
        Importance Funnel · {total} emails
      </h3>
      <div className="space-y-2">
        {levels.map((level) => {
          const pct = total > 0 ? (level.count / total) * 100 : 0;
          if (level.count === 0) return null;
          return (
            <div key={level.label} className="flex items-center gap-3">
              <div className={cn("h-7 w-7 rounded-md border flex items-center justify-center shrink-0", level.bgClass)}>
                <level.icon className={cn("h-3.5 w-3.5", level.colorClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{level.label}</span>
                  <span className="text-xs text-muted-foreground">{level.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", {
                      "bg-destructive": level.label === "Critical",
                      "bg-warning": level.label === "High",
                      "bg-primary": level.label === "Medium",
                    })}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
