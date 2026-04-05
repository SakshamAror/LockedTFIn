import { BookOpen, RefreshCw, Loader2, XCircle, MapPin, Clock, AlertTriangle, User, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

// ── Term options ──────────────────────────────────────────────────────────────
export type TermCode = "FA25" | "WI26" | "SP26" | "FA26";

const TERMS: { code: TermCode; label: string }[] = [
  { code: "FA25", label: "Fall '25" },
  { code: "WI26", label: "Winter '26" },
  { code: "SP26", label: "Spring '26" },
  { code: "FA26", label: "Fall '26" },
];

// ── Color + label per course type ─────────────────────────────────────────────
export const TYPE_META: Record<
  CourseType,
  { label: string; pill: string; bg: string; border: string; dot: string }
> = {
  LE: {
    label: "Lecture",
    pill: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    bg: "bg-blue-500/8",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  DI: {
    label: "Discussion",
    pill: "bg-green-500/15 text-green-400 border-green-500/25",
    bg: "bg-green-500/8",
    border: "border-green-500/20",
    dot: "bg-green-400",
  },
  LA: {
    label: "Lab",
    pill: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  SE: {
    label: "Seminar",
    pill: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/20",
    dot: "bg-cyan-400",
  },
  MI: {
    label: "Midterm",
    pill: "bg-red-500/15 text-red-400 border-red-500/25",
    bg: "bg-red-500/8",
    border: "border-red-500/25",
    dot: "bg-red-400",
  },
  FI: {
    label: "Final",
    pill: "bg-rose-500/15 text-rose-400 border-rose-500/25",
    bg: "bg-rose-500/8",
    border: "border-rose-500/25",
    dot: "bg-rose-400",
  },
};

const DAY_MAP: Record<string, string> = {
  "1": "Mon",
  "2": "Tue",
  "3": "Wed",
  "4": "Thu",
  "5": "Fri",
  "6": "Sat",
  "7": "Sun",
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
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
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
  termCode: TermCode;
  onTermChange: (t: TermCode) => void;
  onFetch: () => void;
  onCancel: () => void;
  onPushToCalendar: () => void;
  pushLoading: boolean;
}

export function WebRegSchedule({
  courses,
  loading,
  hasFetched,
  error,
  termCode,
  onTermChange,
  onFetch,
  onCancel,
  onPushToCalendar,
  pushLoading,
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
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) byDay[day] = [];
  for (const c of weekly) {
    const day = DAY_MAP[c.dayCode];
    if (day) byDay[day].push(c);
  }
  for (const day of Object.keys(byDay)) {
    byDay[day].sort((a, b) => a.startHH * 60 + a.startMM - (b.startHH * 60 + b.startMM));
  }
  const activeDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter(
    (d) => byDay[d].length > 0
  );

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">WebReg Schedule</h2>

          {/* Term selector */}
          <div className="flex gap-1 ml-2">
            {TERMS.map((t) => (
              <button
                key={t.code}
                onClick={() => onTermChange(t.code)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  termCode === t.code
                    ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_12px_-4px_rgba(99,102,241,0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
            >
              <XCircle className="h-3 w-3" />
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onFetch}
            disabled={loading || pushLoading}
            className="gap-1.5 h-7 text-xs"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load Schedule"}
          </Button>
          {hasFetched && courses.length > 0 && (
            <Button
              size="sm"
              onClick={onPushToCalendar}
              disabled={loading || pushLoading}
              className="gap-1.5 h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0"
            >
              {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
              {pushLoading ? "Adding…" : "Add to Calendar"}
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      {(hasFetched || loading) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(Object.entries(TYPE_META) as [CourseType, (typeof TYPE_META)[CourseType]][]).map(
            ([type, meta]) => (
              <span
                key={type}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            )
          )}
        </div>
      )}

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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && courses.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {hasFetched
            ? "No classes found for this term."
            : 'Click "Load Schedule" to fetch your WebReg schedule.'}
        </p>
      )}

      {/* Weekly schedule */}
      {!loading && weekly.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Weekly Recurring
          </p>
          {activeDays.map((day) => (
            <div key={day}>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                {day}
              </p>
              <div className="space-y-1.5">
                {byDay[day].map((c) => (
                  <CourseRow key={c.id} course={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Midterms & Finals */}
      {!loading && oneTime.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-4 mb-1.5">
            Midterms & Finals
          </p>
          {oneTime.map((c) => (
            <CourseRow key={c.id} course={c} showDate />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseRow({ course: c, showDate = false }: { course: WebRegCourse; showDate?: boolean }) {
  const meta = TYPE_META[c.type] ?? TYPE_META.LE;
  const timeStr = `${fmtTime(c.startHH, c.startMM)} – ${fmtTime(c.endHH, c.endMM)}`;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg p-2.5 border transition-colors hover:bg-muted/40 ${meta.bg} ${meta.border}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {c.subj} {c.code}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${meta.pill}`}
          >
            {meta.label}
          </span>
          <span className="text-xs text-muted-foreground truncate">{c.title}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {showDate && c.startDate && (
            <span className="text-xs text-muted-foreground font-medium">{fmtDate(c.startDate)}</span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-2.5 w-2.5 shrink-0" />
            {showDate ? timeStr : `Every ${DAY_MAP[c.dayCode] ?? "?"} ${timeStr}`}
          </span>
          {c.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {c.location}
            </span>
          )}
          {c.instructor && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <User className="h-2.5 w-2.5 shrink-0" />
              {c.instructor}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60">§ {c.section}</span>
        </div>
      </div>
    </div>
  );
}
