import { useState, useRef, useCallback } from "react";
import { Calendar, RefreshCw, Loader2, XCircle, MapPin, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/browserUseCalendar";
import { toast } from "sonner";

export function CalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    toast.info("Calendar fetch cancelled.");
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    toast.info("Fetching calendar events… this may take a few minutes.");

    try {
      const fetched = await fetchCalendarEvents(abortRef.current.signal);
      setEvents(fetched);
      setHasFetched(true);
      if (fetched.length > 0) {
        toast.success(`Found ${fetched.length} upcoming event${fetched.length !== 1 ? "s" : ""}.`);
      } else {
        toast.info("No upcoming events found.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "Failed to fetch calendar.";
      setError(msg);
      toast.error(msg);
      setHasFetched(true);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-display">Upcoming Events</h2>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs">
              <XCircle className="h-3 w-3" />
              Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleFetch} disabled={loading} className="gap-1.5 h-7 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load Events"}
          </Button>
        </div>
      </div>

      {error && !loading && (
        <div className="rounded-lg p-3 mb-3 border border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button size="sm" variant="ghost" onClick={handleFetch} className="gap-1 h-6 text-xs mt-1 px-2">
                <RefreshCw className="h-2.5 w-2.5" /> Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {hasFetched ? "No upcoming events." : "Click \"Load Events\" to fetch your calendar."}
        </p>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-1.5">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{event.summary}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {event.date && (
                    <span className="text-xs text-muted-foreground">{event.date}</span>
                  )}
                  {event.time && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {event.time}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
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
