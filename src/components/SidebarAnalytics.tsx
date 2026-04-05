import { Calendar, BookOpen, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/browserUseCalendar";
import type { CanvasAssignment } from "@/lib/browserUseCanvas";

interface SidebarAnalyticsProps {
  events: CalendarEvent[];
  assignments: CanvasAssignment[];
  lastUpdated: Date | null;
}

export function SidebarAnalytics({ events, assignments, lastUpdated }: SidebarAnalyticsProps) {
  const nextEvent = events[0];
  const nextAssignment = assignments.find((a) => a.dueDate !== "N/A");

  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-2 mt-5">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-1 flex items-center gap-1.5">
        <Sparkles className="h-2.5 w-2.5 text-primary/60" />
        At a Glance
      </h3>

      {/* Next Event */}
      <div className="group rounded-xl p-3 bg-primary/[0.04] border border-primary/[0.08] hover:border-primary/20 hover:bg-primary/[0.07] transition-all duration-300">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-5 w-5 rounded-md bg-primary/15 flex items-center justify-center">
            <Calendar className="h-2.5 w-2.5 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">NEXT EVENT</span>
        </div>
        {nextEvent ? (
          <div>
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{nextEvent.summary}</p>
            <p className="text-[10px] text-muted-foreground mt-1 mono">
              {nextEvent.date} · {nextEvent.time}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 italic">No upcoming events</p>
        )}
      </div>

      {/* Next Assignment */}
      <div className="group rounded-xl p-3 bg-warning/[0.04] border border-warning/[0.08] hover:border-warning/20 hover:bg-warning/[0.07] transition-all duration-300">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-5 w-5 rounded-md bg-warning/15 flex items-center justify-center">
            <BookOpen className="h-2.5 w-2.5 text-warning" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">NEXT DUE</span>
        </div>
        {nextAssignment ? (
          <div>
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{nextAssignment.title}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate mono">
              {nextAssignment.course} · {nextAssignment.dueDate}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 italic">No upcoming assignments</p>
        )}
      </div>

      {/* Last Updated */}
      <div className="rounded-xl p-3 bg-muted/[0.15] border border-border/30">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-muted/30 flex items-center justify-center">
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide">SYNCED</span>
            <p className={cn(
              "text-xs font-semibold leading-tight",
              lastUpdated ? "text-foreground" : "text-muted-foreground/50 italic"
            )}>
              {lastUpdated ? formatTimeAgo(lastUpdated) : "Not yet"}
            </p>
          </div>
          {lastUpdated && (
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
