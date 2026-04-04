import { Clock } from "lucide-react";
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

const dotColor = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
};

export function EmailCard({ email }: { email: Email }) {
  return (
    <div className="card-surface p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={cn("mt-2 h-2 w-2 rounded-full shrink-0", dotColor[email.importance])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground truncate">{email.sender}</span>
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {email.time}
            </span>
          </div>
          <h3 className="text-sm text-foreground/80 mb-1 truncate">{email.subject}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{email.preview}</p>
        </div>
      </div>
    </div>
  );
}
