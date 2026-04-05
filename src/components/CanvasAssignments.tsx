import { BookOpen, RefreshCw, Loader2, XCircle, AlertTriangle, Clock, CheckCircle2, ExternalLink, GraduationCap, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CanvasAssignment } from "@/lib/browserUseCanvas";
import type { GradescopeAssignment } from "@/lib/browserUseGradescope";

export type AssignmentRange = 1 | 7 | 14;

type UnifiedAssignment = (CanvasAssignment & { source: "canvas" }) | GradescopeAssignment;

interface AssignmentsPanelProps {
  assignments: CanvasAssignment[];
  gradescopeAssignments: GradescopeAssignment[];
  loading: boolean;
  gradescopeLoading: boolean;
  hasFetched: boolean;
  gradescopeHasFetched: boolean;
  error: string | null;
  gradescopeError: string | null;
  isConnected: boolean;
  assignmentRange: AssignmentRange;
  onRangeChange: (range: AssignmentRange) => void;
  onFetch: () => void;
  onFetchGradescope: () => void;
  onCancel: () => void;
  onCancelGradescope: () => void;
  onOpenSettings: () => void;
  onPushToCalendar: () => void;
  pushLoading: boolean;
}

export function CanvasAssignments({
  assignments, gradescopeAssignments,
  loading, gradescopeLoading,
  hasFetched, gradescopeHasFetched,
  error, gradescopeError,
  isConnected,
  assignmentRange, onRangeChange,
  onFetch, onFetchGradescope,
  onCancel, onCancelGradescope,
  onOpenSettings,
  onPushToCalendar, pushLoading,
}: AssignmentsPanelProps) {

  const isAnyLoading = loading || gradescopeLoading;

  // Merge and tag Canvas assignments with source
  const taggedCanvas: UnifiedAssignment[] = assignments.map((a) => ({ ...a, source: "canvas" as const }));
  const allAssignments: UnifiedAssignment[] = [...taggedCanvas, ...gradescopeAssignments];

  // Filter by due date range
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff = new Date(startOfToday.getTime() + assignmentRange * 86400000);

  const filteredAssignments = allAssignments.filter((a) => {
    if (a.dueDate === "N/A") return true;
    try {
      const cleaned = a.dueDate.replace(/\s+at\s+/i, " ");
      const due = new Date(cleaned);
      if (isNaN(due.getTime())) return true;
      return due >= startOfToday && due <= cutoff;
    } catch {
      return true;
    }
  });

  // Sort by due date
  filteredAssignments.sort((a, b) => {
    const parseD = (d: string) => {
      if (d === "N/A") return Infinity;
      const cleaned = d.replace(/\s+at\s+/i, " ");
      const t = new Date(cleaned).getTime();
      return isNaN(t) ? Infinity : t;
    };
    return parseD(a.dueDate) - parseD(b.dueDate);
  });

  const sourceColor = (source: string) => {
    return source === "gradescope"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
      : "bg-warning/15 text-warning border-warning/20";
  };

  const sourceIcon = (source: string) => {
    return source === "gradescope"
      ? <GraduationCap className="h-4 w-4 text-emerald-400" />
      : <BookOpen className="h-4 w-4 text-warning" />;
  };

  const sourceBgIcon = (source: string) => {
    return source === "gradescope"
      ? "bg-emerald-500/10"
      : "bg-warning/10";
  };

  const typeLabel = (a: UnifiedAssignment) => {
    if (a.source === "gradescope") return "Gradescope";
    switch ((a as CanvasAssignment).type) {
      case "quiz": return "Quiz";
      case "discussion_topic": return "Discussion";
      default: return "Canvas";
    }
  };

  const typeColor = (a: UnifiedAssignment) => {
    if (a.source === "gradescope") return "bg-emerald-500/15 text-emerald-400";
    switch ((a as CanvasAssignment).type) {
      case "quiz": return "bg-amber-500/15 text-amber-400";
      case "discussion_topic": return "bg-blue-500/15 text-blue-400";
      default: return "bg-warning/15 text-warning";
    }
  };

  if (!isConnected) {
    return (
      <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-warning/15 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-warning" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-display">Assignments</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Connect your UCSD account to see Canvas & Gradescope assignments. Add your SSO credentials in Settings.
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
          <h2 className="text-sm font-semibold text-foreground font-display">Assignments</h2>
          {/* Source badges */}
          <div className="flex gap-1 ml-2">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-warning/15 text-warning">Canvas</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-400">Gradescope</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range filter */}
          <div className="flex gap-1">
            {([1, 7, 14] as AssignmentRange[]).map((range) => (
              <button
                key={range}
                onClick={() => onRangeChange(range)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  assignmentRange === range
                    ? "bg-warning/20 text-warning shadow-[0_0_10px_-4px_hsl(var(--warning)/0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {range === 1 ? "1 day" : `${range} days`}
              </button>
            ))}
          </div>

          {isAnyLoading && (
            <Button variant="outline" size="sm" onClick={() => { onCancel(); onCancelGradescope(); }} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs">
              <XCircle className="h-3 w-3" />
              Cancel
            </Button>
          )}

          {/* Fetch buttons */}
          <Button variant="outline" size="sm" onClick={onFetch} disabled={loading} className="gap-1.5 h-7 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Canvas…" : "Canvas"}
          </Button>
          <Button variant="outline" size="sm" onClick={onFetchGradescope} disabled={gradescopeLoading} className="gap-1.5 h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
            {gradescopeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <GraduationCap className="h-3 w-3" />}
            {gradescopeLoading ? "Gradescope…" : "Gradescope"}
          </Button>
          <Button size="sm" onClick={onPushToCalendar}
            disabled={isAnyLoading || pushLoading || filteredAssignments.length === 0}
            className="gap-1.5 h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0 disabled:opacity-40">
            {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
            {pushLoading ? "Adding…" : "Add to Calendar"}
          </Button>
        </div>
      </div>

      {/* Errors */}
      {error && !loading && (
        <div className="rounded-lg p-3 mb-3 border border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground"><span className="text-warning font-medium">Canvas:</span> {error}</p>
              <Button size="sm" variant="ghost" onClick={onFetch} className="gap-1 h-6 text-xs mt-1 px-2">
                <RefreshCw className="h-2.5 w-2.5" /> Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {gradescopeError && !gradescopeLoading && (
        <div className="rounded-lg p-3 mb-3 border border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground"><span className="text-emerald-400 font-medium">Gradescope:</span> {gradescopeError}</p>
              <Button size="sm" variant="ghost" onClick={onFetchGradescope} className="gap-1 h-6 text-xs mt-1 px-2">
                <RefreshCw className="h-2.5 w-2.5" /> Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isAnyLoading && (
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

      {/* Empty state */}
      {!isAnyLoading && !error && !gradescopeError && filteredAssignments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {(hasFetched || gradescopeHasFetched)
            ? `No assignments due within ${assignmentRange === 1 ? "1 day" : `${assignmentRange} days`}.`
            : 'Click "Canvas" or "Gradescope" to fetch assignments.'}
        </p>
      )}

      {/* Assignment list */}
      {!isAnyLoading && filteredAssignments.length > 0 && (
        <div className="space-y-1.5">
          {filteredAssignments.map((a, i) => (
            <a
              key={`${a.source}-${a.id}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/40 transition-colors group border border-border/30 ${i % 2 === 1 ? 'bg-muted/25' : 'bg-muted/5'}`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${sourceBgIcon(a.source)}`}>
                {sourceIcon(a.source)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColor(a)}`}>
                    {typeLabel(a)}
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
                    <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Submitted
                    </span>
                  )}
                  {a.source === "gradescope" && (a as GradescopeAssignment).lateDueDate && (
                    <span className="text-[10px] text-muted-foreground/70">
                      Late: {(a as GradescopeAssignment).lateDueDate}
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
