import { BookOpen, RefreshCw, Loader2, XCircle, AlertTriangle, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CanvasAssignment } from "@/lib/browserUseCanvas";

export type AssignmentRange = 1 | 7 | 14;

interface CanvasAssignmentsProps {
  assignments: CanvasAssignment[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  isConnected: boolean;
  assignmentRange: AssignmentRange;
  onRangeChange: (range: AssignmentRange) => void;
  onFetch: () => void;
  onCancel: () => void;
  onOpenSettings: () => void;
}

export function CanvasAssignments({
  assignments, loading, hasFetched, error, isConnected,
  assignmentRange, onRangeChange, onFetch, onCancel, onOpenSettings,
}: CanvasAssignmentsProps) {
  const typeLabel = (type: string) => {
    switch (type) {
      case "quiz": return "Quiz";
      case "discussion_topic": return "Discussion";
      default: return "Assignment";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "quiz": return "bg-warning/10 text-warning ring-warning/15";
      case "discussion_topic": return "bg-accent/10 text-accent ring-accent/15";
      default: return "bg-primary/10 text-primary ring-primary/15";
    }
  };

  const now = new Date();
  const cutoff = new Date(now.getTime() + assignmentRange * 86400000);

  const filteredAssignments = assignments.filter((a) => {
    if (a.dueDate === "N/A") return assignmentRange === 14;
    try {
      const due = new Date(a.dueDate);
      return due >= now && due <= cutoff;
    } catch {
      return true;
    }
  });

  if (!isConnected) {
    return (
      <div className="glass glass-interactive rounded-xl p-5 mb-5 animate-fade-in">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center ring-1 ring-warning/10">
            <BookOpen className="h-4 w-4 text-warning" />
          </div>
          <h2 className="text-sm font-bold text-foreground font-display tracking-tight">Canvas Assignments</h2>
        </div>
        <p className="text-xs text-muted-foreground/70 mb-3 leading-relaxed">
          Connect your UCSD Canvas account to see your assignments. Add your SSO username and password in Settings.
        </p>
        <Button variant="outline" size="sm" onClick={onOpenSettings} className="gap-1.5 h-7 text-xs rounded-lg">
          Open Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="glass glass-interactive rounded-xl p-5 mb-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center ring-1 ring-warning/10">
            <BookOpen className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground font-display tracking-tight">Canvas Assignments</h2>
            {filteredAssignments.length > 0 && (
              <span className="text-[10px] text-muted-foreground mono">{filteredAssignments.length} due</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Range filter pills */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted/20 ring-1 ring-border/20">
            {([1, 7, 14] as AssignmentRange[]).map((range) => (
              <button
                key={range}
                onClick={() => onRangeChange(range)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${
                  assignmentRange === range
                    ? "bg-warning/15 text-warning shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range === 1 ? "1d" : `${range}d`}
              </button>
            ))}
          </div>
          {loading && (
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10 h-7 text-xs rounded-lg">
              <XCircle className="h-3 w-3" />
              Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onFetch} disabled={loading} className="gap-1.5 h-7 text-xs rounded-lg">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load"}
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
          {Array.from({ length: 4 }).map((_, i) => (
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

      {!loading && !error && filteredAssignments.length === 0 && (
        <div className="text-center py-6">
          <BookOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/60">
            {hasFetched
              ? `No assignments due within ${assignmentRange === 1 ? "1 day" : `${assignmentRange} days`}.`
              : 'Click "Load" to fetch from Canvas.'}
          </p>
        </div>
      )}

      {!loading && filteredAssignments.length > 0 && (
        <div className="space-y-1.5">
          {filteredAssignments.map((a, i) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl p-3 hover:bg-warning/[0.04] transition-all duration-200 group border border-transparent hover:border-warning/10"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center shrink-0 ring-1 ring-warning/10">
                <BookOpen className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate tracking-tight">{a.title}</p>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ring-1 ${typeColor(a.type)}`}>
                    {typeLabel(a.type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">{a.course}</span>
                  {a.dueDate !== "N/A" && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground mono">
                      <Clock className="h-2.5 w-2.5" />
                      {a.dueDate}
                    </span>
                  )}
                  {a.points !== "N/A" && (
                    <span className="text-[10px] text-muted-foreground/60 mono">{a.points}pts</span>
                  )}
                  {a.submitted && (
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-success">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Done
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
