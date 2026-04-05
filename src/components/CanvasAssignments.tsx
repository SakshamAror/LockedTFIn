import { useState, useRef, useCallback } from "react";
import { BookOpen, RefreshCw, Loader2, XCircle, AlertTriangle, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCanvasAssignments, type CanvasAssignment } from "@/lib/browserUseCanvas";
import { getSettings } from "@/components/SettingsPanel";
import { toast } from "sonner";

export function CanvasAssignments({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { canvasUsername, canvasPassword, apiKey } = getSettings();
  const isCanvasConnected = !!(canvasUsername && canvasPassword && apiKey);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    toast.info("Canvas fetch cancelled.");
  }, []);

  const handleFetch = async () => {
    if (!isCanvasConnected) {
      toast.error("Please set your Canvas SSO credentials in Settings first.");
      onOpenSettings();
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    toast.info("Fetching Canvas assignments… A Duo 2FA prompt will appear on your device — please approve it to continue.", { duration: 10000 });

    try {
      const fetched = await fetchCanvasAssignments(abortRef.current.signal);
      setAssignments(fetched);
      setHasFetched(true);
      if (fetched.length > 0) {
        toast.success(`Found ${fetched.length} assignment${fetched.length !== 1 ? "s" : ""}.`);
      } else {
        toast.info("No assignments found.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "Failed to fetch Canvas assignments.";
      setError(msg);
      toast.error(msg);
      setHasFetched(true);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "quiz": return "Quiz";
      case "discussion_topic": return "Discussion";
      default: return "Assignment";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "quiz": return "bg-warning/15 text-warning";
      case "discussion_topic": return "bg-accent/15 text-accent";
      default: return "bg-primary/15 text-primary";
    }
  };

  if (!isCanvasConnected) {
    return (
      <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-warning/15 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-warning" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-display">Canvas Assignments</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Connect your UCSD Canvas account to see your assignments. Add your SSO username and password in Settings.
        </p>
        <Button variant="outline" size="sm" onClick={onOpenSettings} className="gap-1.5 h-7 text-xs">
          Open Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-warning/15 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-warning" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-display">Canvas Assignments</h2>
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
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load Assignments"}
          </Button>
        </div>
      </div>

      {/* Error */}
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

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
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

      {/* Empty */}
      {!loading && !error && assignments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {hasFetched ? "No assignments found." : 'Click "Load Assignments" to fetch from Canvas.'}
        </p>
      )}

      {/* Assignment list */}
      {!loading && assignments.length > 0 && (
        <div className="space-y-1.5">
          {assignments.map((a, i) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/40 transition-colors group border border-border/30 ${i % 2 === 1 ? 'bg-muted/25' : 'bg-muted/5'}`}
            >
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColor(a.type)}`}>
                    {typeLabel(a.type)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{a.course}</span>
                  {a.dueDate !== "N/A" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {a.dueDate}
                    </span>
                  )}
                  {a.points !== "N/A" && (
                    <span className="text-xs text-muted-foreground">{a.points} pts</span>
                  )}
                  {a.submitted && (
                    <span className="flex items-center gap-0.5 text-[10px] text-success">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Submitted
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
