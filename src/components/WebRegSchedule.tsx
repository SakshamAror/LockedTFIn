import { BookOpen, RefreshCw, Loader2, XCircle, MapPin, Clock, AlertTriangle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

export type TermCode = "FA25" | "WI26" | "SP26" | "FA26";

// ── Color + label per course type ─────────────────────────────────────────────
export const TYPE_META: Record<
  CourseType,
  { label: string; pill: string; dot: string; bar: string }
> = {
  LE: {
    label: "Lecture",
    pill: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    dot: "bg-blue-400",
    bar: "bg-blue-400",
  },
  DI: {
    label: "Discussion",
    pill: "bg-green-500/15 text-green-400 border-green-500/25",
    dot: "bg-green-400",
    bar: "bg-green-400",
  },
  LA: {
    label: "Lab",
    pill: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
  },
  SE: {
    label: "Seminar",
    pill: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    dot: "bg-cyan-400",
    bar: "bg-cyan-400",
  },
  MI: {
    label: "Midterm",
    pill: "bg-red-500/15 text-red-400 border-red-500/25",
    dot: "bg-red-400",
    bar: "bg-red-400",
  },
  FI: {
    label: "Final",
    pill: "bg-rose-500/15 text-rose-400 border-rose-500/25",
    dot: "bg-rose-400",
    bar: "bg-rose-400",
  },
};

const DAY_MAP: Record<string, string> = {
  "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu",
  "5": "Fri", "6": "Sat", "7": "Sun",
};
const ONE_TIME: CourseType[] = ["FI", "MI"];

function fmtTime(hh: number, mm: number) {
  const suffix = hh < 12 ? "AM" : "PM";
  const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h}:${mm.toString().padStart(2, "0")} ${suffix}`;
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return "TBA";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
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
    .sort(
      (a, b) =>
        (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999") ||
        a.startHH * 60 + a.startMM - (b.startHH * 60 + b.startMM)
    );

  // Group weekly by day
  const byDay: Record<string, WebRegCourse[]> = {};
  for (const d of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]) byDay[d] = [];
  for (const c of weekly) {
    const day = DAY_MAP[c.dayCode];
    if (day) byDay[day].push(c);
  }
  for (const d of Object.keys(byDay)) {
    byDay[d].sort((a, b) => a.startHH * 60 + a.startMM - (b.startHH * 60 + b.startMM));
  }
  const activeDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].filter((d) => byDay[d].length > 0);

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">WebReg Schedule</h2>
          {/* Color legend pills */}
          {(hasFetched || loading) && (
            <div className="flex gap-1 ml-1">
              {(Object.entries(TYPE_META) as [CourseType, typeof TYPE_META[CourseType]][]).map(([type, meta]) => (
                <span key={type} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${meta.pill}`}>
                  <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
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
        <div className="rounded-lg p-3 mb-3 border border-destructive/20 bg-destructive/5">
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

      {/* Skeleton */}
      {loading && (
        <div className="space-y-1.5 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && courses.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {hasFetched ? "No classes found for this term." : 'Click "Load Schedule" to fetch your WebReg schedule.'}
        </p>
      )}

      {/* Weekly schedule — compact rows */}
      {!loading && weekly.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Weekly Recurring</p>
          <div className="space-y-0.5">
            {activeDays.map((day) =>
              byDay[day].map((c, i) => (
                <CompactRow key={c.id} course={c} showDay={i === 0} day={day} dayCount={byDay[day].length} rowIndex={i} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Midterms & Finals */}
      {!loading && oneTime.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Midterms & Finals</p>
          <div className="space-y-0.5">
            {oneTime.map((c) => (
              <CompactRow key={c.id} course={c} showDate />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactRow({
  course: c,
  showDay = false,
  day = "",
  dayCount = 1,
  rowIndex = 0,
  showDate = false,
}: {
  course: WebRegCourse;
  showDay?: boolean;
  day?: string;
  dayCount?: number;
  rowIndex?: number;
  showDate?: boolean;
}) {
  const meta = TYPE_META[c.type] ?? TYPE_META.LE;
  const timeStr = `${fmtTime(c.startHH, c.startMM)}–${fmtTime(c.endHH, c.endMM)}`;
  const isLastInDay = rowIndex === dayCount - 1;

  return (
    <div className={`flex items-center gap-0 ${isLastInDay && !showDate ? "mb-2" : ""}`}>
      {/* Day label column — only shown for first row of a day */}
      {!showDate && (
        <div className="w-8 shrink-0 flex justify-end pr-1.5">
          {showDay && (
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase">{day}</span>
          )}
        </div>
      )}

      {/* Color accent bar */}
      <div className={`w-0.5 self-stretch rounded-full mx-1.5 shrink-0 ${meta.bar} opacity-70`} />

      {/* Content */}
      <div className="flex items-center gap-2 flex-1 min-w-0 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
        {/* Course + type */}
        <span className="text-xs font-semibold text-foreground shrink-0">
          {c.subj} {c.code}
        </span>
        <span className={`px-1.5 py-0 rounded text-[9px] font-medium border shrink-0 ${meta.pill}`}>
          {meta.label}
        </span>

        {/* Date for exams */}
        {showDate && c.startDate && (
          <span className="text-xs text-muted-foreground shrink-0">{fmtDate(c.startDate)}</span>
        )}

        {/* Time */}
        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground shrink-0">
          <Clock className="h-2.5 w-2.5" />
          {timeStr}
        </span>

        {/* Location */}
        {c.location && (
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground truncate">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {c.location}
          </span>
        )}

        {/* Course title — truncated filler */}
        <span className="text-[11px] text-muted-foreground/50 truncate hidden sm:block">{c.title}</span>
      </div>
    </div>
  );
}
