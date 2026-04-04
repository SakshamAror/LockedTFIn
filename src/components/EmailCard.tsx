import { Mail, Star, Clock, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Email {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  importance: "critical" | "high" | "medium";
  unread: boolean;
  category: string;
}

const importanceStyles = {
  critical: "bg-destructive/15 text-destructive border-destructive/20",
  high: "bg-warning/15 text-warning border-warning/20",
  medium: "bg-primary/15 text-primary border-primary/20",
};

const importanceDot = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
};

export function EmailCard({ email, index }: { email: Email; index: number }) {
  return (
    <div
      className={cn(
        "group glass rounded-lg p-4 transition-all duration-200 hover:glass-highlight cursor-pointer",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", importanceDot[email.importance])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate">{email.sender}</span>
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {email.time}
            </span>
          </div>
          <h3 className="text-sm font-medium text-foreground/90 mb-1 truncate">{email.subject}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{email.preview}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", importanceStyles[email.importance])}>
              {email.importance}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
              {email.category}
            </Badge>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>
    </div>
  );
}
