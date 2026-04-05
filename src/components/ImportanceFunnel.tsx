import { Mail, ShieldAlert } from "lucide-react";
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
      label: "Unread today",
      count: unreadCount,
      icon: Mail,
      colorClass: "text-primary",
      bgClass: "bg-primary/15 border-primary/25",
    },
    {
      label: "Critical",
      count: criticalCount,
      icon: ShieldAlert,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/15 border-destructive/25",
    },
  ];

  return (
    <div className="glass rounded-lg p-5 animate-fade-in">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 font-display">
        Today's Summary
      </h3>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className={cn("h-7 w-7 rounded-md border flex items-center justify-center shrink-0", stat.bgClass)}>
              <stat.icon className={cn("h-3.5 w-3.5", stat.colorClass)} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <p className={cn("text-lg font-semibold font-display", stat.count > 0 ? "text-foreground" : "text-muted-foreground")}>
                {stat.count}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
