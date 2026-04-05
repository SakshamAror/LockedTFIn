import { Calendar, BookOpen, Clock } from "lucide-react";
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
    <div className="space-y-3 mt-4">
      <h3 className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider px-1">
        At a Glance
      </h3>

      {/* Next Event */}
      <div className="glass rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Next Event</span>
        </div>
        {nextEvent ? (
          <div>
            <p className="text-xs font-mono font-medium text-foreground truncate">{nextEvent.summary}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {nextEvent.date} · {nextEvent.time}
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-muted-foreground italic">No upcoming events</p>
        )}
      </div>

      {/* Next Assignment */}
      <div className="glass rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen className="h-3 w-3 text-warning" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Next Due</span>
        </div>
        {nextAssignment ? (
          <div>
            <p className="text-xs font-mono font-medium text-foreground truncate">{nextAssignment.title}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
              {nextAssignment.course} · {nextAssignment.dueDate}
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-muted-foreground italic">No upcoming assignments</p>
        )}
      </div>

      {/* Last Updated */}
      <div className="glass rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Last Updated</span>
        </div>
        <p className={cn("text-xs font-medium", lastUpdated ? "text-foreground" : "text-muted-foreground italic")}>
          {lastUpdated ? formatTimeAgo(lastUpdated) : "Not yet"}
        </p>
      </div>
    </div>
  );
}
