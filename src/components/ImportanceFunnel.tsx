import { Mail, ShieldAlert, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailStats {
  unread: boolean;
  importance: string;
}

export function ImportanceFunnel({ emails }: { emails: EmailStats[] }) {
  const unreadCount = emails.filter(e => e.unread).length;
  const criticalCount = emails.filter(e => e.importance === "critical").length;

  const stats = [
    {
      label: "Unread",
      count: unreadCount,
      icon: Mail,
      color: "text-primary",
      bg: "bg-primary/10",
      ring: "ring-primary/20",
      glow: unreadCount > 0 ? "shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)]" : "",
    },
    {
      label: "Critical",
      count: criticalCount,
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
      ring: "ring-destructive/20",
      glow: criticalCount > 0 ? "shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.3)]" : "",
    },
  ];

  return (
    <div className="rounded-xl p-4 bg-muted/[0.08] border border-border/20 animate-fade-in">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
        <TrendingUp className="h-2.5 w-2.5 text-primary/60" />
        Today
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-lg p-3 ring-1 transition-all duration-300",
              stat.bg, stat.ring, stat.glow
            )}
          >
            <stat.icon className={cn("h-3.5 w-3.5 mb-2", stat.color)} />
            <p className={cn(
              "text-xl font-bold font-display tabular-nums leading-none",
              stat.count > 0 ? "text-foreground" : "text-muted-foreground/40"
            )}>
              {stat.count}
            </p>
            <span className="text-[10px] text-muted-foreground mt-1 block">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
