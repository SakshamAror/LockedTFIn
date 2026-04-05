import { useState } from "react";
import { Clock, ArrowUpRight, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Email {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  date: string;
  importance: "critical" | "high" | "medium";
  unread: boolean;
  category: string;
}

export type TimeRange = "today" | "week" | "month";
export type EmailCount = 5 | 10 | 30;

const importanceConfig = {
  critical: {
    badge: "bg-destructive/15 text-destructive border-destructive/20",
    dot: "bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.5)]",
    bar: "bg-destructive",
  },
  high: {
    badge: "bg-warning/15 text-warning border-warning/20",
    dot: "bg-warning shadow-[0_0_6px_hsl(var(--warning)/0.5)]",
    bar: "bg-warning",
  },
  medium: {
    badge: "bg-primary/15 text-primary border-primary/20",
    dot: "bg-primary",
    bar: "bg-primary",
  },
};

export function EmailCard({ email, index }: { email: Email; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = importanceConfig[email.importance];

  return (
    <div
      className={cn(
        "group glass rounded-lg transition-all duration-200 hover:glass-highlight cursor-pointer overflow-hidden",
        "animate-fade-in",
        expanded && "glow-primary"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Importance accent bar */}
      <div className={cn("h-0.5 w-full", config.bar)} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank number */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-medium text-muted-foreground font-display">#{index + 1}</span>
            <div className={cn("h-2 w-2 rounded-full shrink-0", config.dot)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground truncate">{email.sender}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {email.time}
                </span>
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
            <h3 className="text-sm font-medium text-foreground/90 mb-1 truncate">{email.subject}</h3>

            {!expanded && (
              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{email.preview}</p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold", config.badge)}>
                {email.importance}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {email.category}
              </Badge>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 ml-9 pt-3 border-t border-border/50 animate-fade-in">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{email.preview}</p>
            <div className="flex items-center gap-2 mt-3">
              <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                Open in Gmail
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
