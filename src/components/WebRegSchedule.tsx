import { BookOpen, RefreshCw, Loader2, XCircle, AlertTriangle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

export const TYPE_META: Record<CourseType, { label: string; pill: string; bar: string }> = {
  LE: { label: "Lecture",    pill: "bg-blue-500/15 text-blue-400",   bar: "bg-blue-400" },
  DI: { label: "Discussion", pill: "bg-green-500/15 text-green-400", bar: "bg-green-400" },
  LA: { label: "Lab",        pill: "bg-amber-500/15 text-amber-400", bar: "bg-amber-400" },
  SE: { label: "Seminar",    pill: "bg-cyan-500/15 text-cyan-400",   bar: "bg-cyan-400" },
  MI: { label: "Midterm",    pill: "bg-red-500/15 text-red-400",     bar: "bg-red-400" },
  FI: { label: "Final",      pill: "bg-rose-500/15 text-rose-400",   bar: "bg-rose-400" },
};

const DAY_MAP: Record<string, string> = {
  "1": "M", "2": "Tu", "3": "W", "4": "Th", "5": "F", "6": "Sa", "7": "Su",
};
const ONE_TIME: CourseType[] = ["FI", "MI"];

function fmtTime(hh: number, mm: number) {
  const suffix = hh < 12 ? "a" : "p";
  const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h}:${mm.toString().padStart(2, "0")}${suffix}`;
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return "TBA";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  } catch { return dateStr; }
}

interface WebRegScheduleProps {
  courses: WebRegCourse[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  onFetch: () => void;
  onCancel: () => void;
  onPushToCalendar: () => void;
  pushLoading: boolean;
}

export function WebRegSchedule({
  courses, loading, hasFetched, error,
  onFetch, onCancel, onPushToCalendar, pushLoading,
}: WebRegScheduleProps) {
  const weekly = courses.filter((c) => !ONE_TIME.includes(c.type));
  const oneTime = courses
    .filter((c) => ONE_TIME.includes(c.type))
    .sort((a, b) =>
      (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999") ||
      a.startHH * 60 + a.startMM - (b.startHH * 60 + b.startMM)
    );

  // Group weekly courses: by subject+code, collect all sections
  const courseMap = new Map<string, WebRegCourse[]>();
  for (const c of weekly) {
    const key = `${c.subj} ${c.code}`;
    if (!courseMap.has(key)) courseMap.set(key, []);
    courseMap.get(key)!.push(c);
  }

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">WebReg Schedule</h2>
          {/* Legend */}
          <div className="flex gap-1 ml-1 flex-wrap">
            {(Object.entries(TYPE_META) as [CourseType, typeof TYPE_META[CourseType]][]).map(([type, meta]) => (
              <span key={type} className={`px-1.5 py-0 rounded text-[9px] font-medium ${meta.pill}`}>
                {meta.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading && (
            <Button variant="outline" size="sm" onClick={onCancel}
              className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs">
              <XCircle className="h-3 w-3" /> Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onFetch} disabled={loading || pushLoading}
            className="gap-1.5 h-7 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load Schedule"}
          </Button>
          <Button size="sm" onClick={onPushToCalendar}
            disabled={loading || pushLoading || courses.length === 0}
            className="gap-1.5 h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0 disabled:opacity-40">
            {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
            {pushLoading ? "Adding…" : "Add to Calendar"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg p-3 mb-3 border border-destructive/20 bg-destructive/5 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button size="sm" variant="ghost" onClick={onFetch} className="gap-1 h-6 text-xs mt-1 px-2">
              <RefreshCw className="h-2.5 w-2.5" /> Try again
            </Button>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-1.5 mt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && courses.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {hasFetched ? "No classes found for this term." : 'Click "Load Schedule" to fetch your WebReg schedule.'}
        </p>
      )}

      {/* Weekly table */}
      {!loading && weekly.length > 0 && (
        <div className="mt-1">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Course</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Days</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Time</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Room</span>
          </div>

          <div className="divide-y divide-border/20">
            {Array.from(courseMap.entries()).map(([courseKey, sections]) => (
              <div key={courseKey} className="py-1">
                {sections.map((c) => {
                  const meta = TYPE_META[c.type] ?? TYPE_META.LE;
                  return (
                    <div key={c.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-2 py-0.5 rounded hover:bg-muted/30 transition-colors group">
                      {/* Course + type badge */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-1 h-3.5 rounded-full shrink-0 ${meta.bar}`} />
                        <span className="text-xs font-semibold text-foreground shrink-0">{courseKey}</span>
                        <span className={`px-1 py-0 rounded text-[9px] font-medium shrink-0 ${meta.pill}`}>{meta.label}</span>
                        <span className="text-[11px] text-muted-foreground/60 truncate">{c.title}</span>
                      </div>
                      {/* Days */}
                      <span className="text-xs text-muted-foreground font-medium tabular-nums">
                        {DAY_MAP[c.dayCode] ?? "?"}
                      </span>
                      {/* Time */}
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {fmtTime(c.startHH, c.startMM)}–{fmtTime(c.endHH, c.endMM)}
                      </span>
                      {/* Room */}
                      <span className="text-xs text-muted-foreground/70 tabular-nums whitespace-nowrap">
                        {c.location || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Midterms & Finals */}
      {!loading && oneTime.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-1.5 px-2">
            Midterms & Finals
          </p>
          <div className="divide-y divide-border/20">
            {oneTime.map((c) => {
              const meta = TYPE_META[c.type] ?? TYPE_META.MI;
              return (
                <div key={c.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-2 py-1 rounded hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1 h-3.5 rounded-full shrink-0 ${meta.bar}`} />
                    <span className="text-xs font-semibold text-foreground shrink-0">{c.subj} {c.code}</span>
                    <span className={`px-1 py-0 rounded text-[9px] font-medium shrink-0 ${meta.pill}`}>{meta.label}</span>
                    <span className="text-[11px] text-muted-foreground/60 truncate">{c.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {fmtDate(c.startDate)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {fmtTime(c.startHH, c.startMM)}–{fmtTime(c.endHH, c.endMM)}
                  </span>
                  <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                    {c.location || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
