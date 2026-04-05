import { Calendar, RefreshCw, Loader2, XCircle, MapPin, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarEvent } from "@/lib/browserUseCalendar";

interface CalendarEventsProps {
  events: CalendarEvent[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  onFetch: () => void;
  onCancel: () => void;
}

export function CalendarEvents({ events, loading, hasFetched, error, onFetch, onCancel }: CalendarEventsProps) {
  return (
    <div className="glass glass-interactive rounded-xl p-5 mb-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center ring-1 ring-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground font-display tracking-tight">Upcoming Events</h2>
            {events.length > 0 && (
              <span className="text-[10px] text-muted-foreground mono">{events.length} event{events.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10 h-7 text-xs rounded-lg">
              <XCircle className="h-3 w-3" />
              Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onFetch} disabled={loading} className="gap-1.5 h-7 text-xs rounded-lg">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load Events"}
          </Button>
        </div>
      </div>

      {error && !loading && (
        <div className="rounded-lg p-3 mb-3 border border-destructive/15 bg-destructive/[0.04]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button size="sm" variant="ghost" onClick={onFetch} className="gap-1 h-6 text-xs mt-1 px-2">
                <RefreshCw className="h-2.5 w-2.5" /> Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-6">
          <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/60">
            {hasFetched ? "No upcoming events." : 'Click "Load Events" to fetch your calendar.'}
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-1.5">
          {events.map((event, i) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-primary/[0.04] border border-transparent hover:border-primary/10 group/event"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/15 to-primary/10 flex items-center justify-center shrink-0 ring-1 ring-accent/10">
                <Calendar className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate tracking-tight">{event.summary}</p>
                <div className="flex items-center gap-3 mt-1">
                  {event.date && <span className="text-[10px] text-muted-foreground mono">{event.date}</span>}
                  {event.time && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground mono">
                      <Clock className="h-2.5 w-2.5" />
                      {event.time}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/50" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
