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
    badge: "bg-destructive/10 text-destructive border-destructive/15",
    dot: "bg-destructive",
    bar: "bg-gradient-to-r from-destructive to-destructive/60",
    glow: "shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.15)]",
  },
  high: {
    badge: "bg-warning/10 text-warning border-warning/15",
    dot: "bg-warning",
    bar: "bg-gradient-to-r from-warning to-warning/60",
    glow: "shadow-[0_0_20px_-4px_hsl(var(--warning)/0.15)]",
  },
  medium: {
    badge: "bg-primary/10 text-primary border-primary/15",
    dot: "bg-primary",
    bar: "bg-gradient-to-r from-primary to-primary/60",
    glow: "",
  },
};

export function EmailCard({ email, index }: { email: Email; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = importanceConfig[email.importance];

  return (
    <div
      className={cn(
        "group glass glass-interactive rounded-xl overflow-hidden cursor-pointer",
        "animate-fade-in",
        expanded && "glow-primary"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Importance accent bar */}
      <div className={cn("h-[2px] w-full", config.bar)} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div className="flex flex-col items-center gap-2 shrink-0 pt-0.5">
            <span className="text-[10px] font-bold text-muted-foreground/60 mono">#{index + 1}</span>
            <div className={cn("h-2 w-2 rounded-full shrink-0 glow-dot", config.dot)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-bold text-foreground truncate tracking-tight">{email.sender}</span>
              <div className="flex items-center gap-2.5 shrink-0">
                {email.date && (
                  <span className="text-[10px] text-muted-foreground/70 mono">{email.date}</span>
                )}
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mono">
                  <Clock className="h-2.5 w-2.5" />
                  {email.time}
                </span>
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-primary transition-transform" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all" />
                )}
              </div>
            </div>
            <h3 className="text-[13px] font-semibold text-foreground/85 mb-1.5 truncate">{email.subject}</h3>

            {!expanded && (
              <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-relaxed">{email.preview}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2.5">
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 uppercase tracking-[0.1em] font-bold rounded-md", config.badge)}>
                {email.importance}
              </Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/40 text-muted-foreground/60 rounded-md">
                <Tag className="h-2 w-2 mr-1" />
                {email.category}
              </Badge>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 ml-9 pt-3 border-t border-border/30 animate-fade-in">
            <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">{email.preview}</p>
            <div className="flex items-center gap-2 mt-4">
              <a
                href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent("from:" + email.sender + " subject:" + email.subject)}`}
                target="_blank"
                rel="noopener noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(e.currentTarget.href, "_blank"); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors relative z-20 group/link"
              >
                Open in Gmail
                <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
