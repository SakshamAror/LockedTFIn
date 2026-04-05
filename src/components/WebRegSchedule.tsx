import { BookOpen, RefreshCw, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

export const TYPE_META: Record<CourseType, { label: string; pill: string; bar: string }> = {
  LE: { label: "LE",  pill: "bg-blue-500/15 text-blue-400",   bar: "bg-blue-400" },
  DI: { label: "DI",  pill: "bg-green-500/15 text-green-400", bar: "bg-green-400" },
  LA: { label: "LA",  pill: "bg-amber-500/15 text-amber-400", bar: "bg-amber-400" },
  SE: { label: "SE",  pill: "bg-cyan-500/15 text-cyan-400",   bar: "bg-cyan-400" },
  MI: { label: "MI",  pill: "bg-red-500/15 text-red-400",     bar: "bg-red-400" },
  FI: { label: "FI",  pill: "bg-rose-500/15 text-rose-400",   bar: "bg-rose-400" },
};

// Short day abbreviations in day-number order
const DAY_ABBR: Record<string, string> = {
  "1": "M", "2": "Tu", "3": "W", "4": "Th", "5": "F", "6": "Sa", "7": "Su",
};
const DAY_ORDER = ["1","2","3","4","5","6","7"];

const ONE_TIME: CourseType[] = ["FI", "MI"];

function fmtTime(hh: number, mm: number) {
  const suffix = hh < 12 ? "a" : "p";
  const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h}:${mm.toString().padStart(2, "0")}${suffix}`;
}

function fmtDateShort(dateStr?: string) {
  if (!dateStr) return "TBA";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "numeric", day: "numeric",
    });
  } catch { return dateStr; }
}

// Merged section: same course+section+type, days collapsed to e.g. "MWF"
interface MergedSection {
  id: string;
  subj: string;
  code: string;
  title: string;
  section: string;
  type: CourseType;
  days: string;       // e.g. "MWF", "TuTh", "M"
  startHH: number;
  startMM: number;
  endHH: number;
  endMM: number;
  location: string;
  instructor: string;
  startDate?: string; // for MI/FI
}

interface CourseGroup {
  key: string;        // "CSE 21"
  title: string;
  sections: MergedSection[];
  exams: MergedSection[];
}

function mergeCourses(courses: WebRegCourse[]): CourseGroup[] {
  // Step 1: merge days for weekly sections
  const sectionMap = new Map<string, MergedSection & { dayCodes: Set<string> }>();

  for (const c of courses) {
    if (ONE_TIME.includes(c.type)) continue;
    const key = `${c.subj}|${c.code}|${c.section}|${c.type}`;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        id: c.id, subj: c.subj, code: c.code, title: c.title,
        section: c.section, type: c.type,
        days: "", dayCodes: new Set(),
        startHH: c.startHH, startMM: c.startMM,
        endHH: c.endHH, endMM: c.endMM,
        location: c.location, instructor: c.instructor,
      });
    }
    if (c.dayCode) sectionMap.get(key)!.dayCodes.add(c.dayCode);
  }

  // Step 2: build exams list (already deduplicated by WebReg lib)
  const examList: MergedSection[] = courses
    .filter((c) => ONE_TIME.includes(c.type))
    .map((c) => ({
      id: c.id, subj: c.subj, code: c.code, title: c.title,
      section: c.section, type: c.type,
      days: c.dayCode ? DAY_ABBR[c.dayCode] ?? "" : "",
      startHH: c.startHH, startMM: c.startMM,
      endHH: c.endHH, endMM: c.endMM,
      location: c.location, instructor: c.instructor,
      startDate: c.startDate,
    }))
    .sort((a, b) =>
      (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999") ||
      a.startHH * 60 + a.startMM - (b.startHH * 60 + b.startMM)
    );

  // Step 3: resolve days string and group by course
  const courseMap = new Map<string, CourseGroup>();

  for (const [, s] of sectionMap) {
    s.days = DAY_ORDER.filter((d) => s.dayCodes.has(d)).map((d) => DAY_ABBR[d]).join("");
    const courseKey = `${s.subj} ${s.code}`;
    if (!courseMap.has(courseKey)) {
      courseMap.set(courseKey, { key: courseKey, title: s.title, sections: [], exams: [] });
    }
    courseMap.get(courseKey)!.sections.push(s);
  }

  // Attach exams to their course
  for (const exam of examList) {
    const courseKey = `${exam.subj} ${exam.code}`;
    if (!courseMap.has(courseKey)) {
      courseMap.set(courseKey, { key: courseKey, title: exam.title, sections: [], exams: [] });
    }
    courseMap.get(courseKey)!.exams.push(exam);
  }

  // Sort sections within each course by type priority
  const typePriority: Record<CourseType, number> = { LE: 0, SE: 1, DI: 2, LA: 3, MI: 4, FI: 5 };
  for (const group of courseMap.values()) {
    group.sections.sort((a, b) => typePriority[a.type] - typePriority[b.type]);
  }

  return Array.from(courseMap.values());
}

interface WebRegScheduleProps {
  courses: WebRegCourse[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  onFetch: () => void;
  onCancel: () => void;
}

export function WebRegSchedule({
  courses, loading, hasFetched, error,
  onFetch, onCancel,
}: WebRegScheduleProps) {
  const groups = mergeCourses(courses);
  const hasExams = groups.some((g) => g.exams.length > 0);

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">WebReg Schedule</h2>
          {/* Type legend */}
          <div className="flex gap-1 ml-1">
            {(Object.entries(TYPE_META) as [CourseType, typeof TYPE_META[CourseType]][]).map(([type, meta]) => (
              <span key={type} className={`px-1.5 py-0 rounded text-[9px] font-medium ${meta.pill}`}>
                {meta.label === "LE" ? "Lecture" : meta.label === "DI" ? "Discussion" :
                 meta.label === "LA" ? "Lab" : meta.label === "SE" ? "Seminar" :
                 meta.label === "MI" ? "Midterm" : "Final"}
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
          <Button variant="outline" size="sm" onClick={onFetch} disabled={loading}
            className="gap-1.5 h-7 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Fetching…" : hasFetched ? "Refresh" : "Load Schedule"}
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
        <div className="space-y-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-4/5 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && courses.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          {hasFetched ? "No classes found for this term." : 'Click "Load Schedule" to fetch your WebReg schedule.'}
        </p>
      )}

      {/* Course table */}
      {!loading && groups.length > 0 && (
        <div className="mt-1">
          {/* Column headers */}
          <div className="grid gap-x-3 px-1 mb-1" style={{ gridTemplateColumns: "6rem 2.5rem 2rem 3.5rem 7rem 1fr" }}>
            {["Course", "Sec", "Type", "Days", "Time", "Room"].map((h) => (
              <span key={h} className="text-[9px] uppercase tracking-wider text-muted-foreground/40 font-semibold">{h}</span>
            ))}
          </div>

          <div className="space-y-0">
            {groups.map((group) => (
              <div key={group.key} className="border-t border-border/20 first:border-t-0 pt-1 pb-0.5">
                {/* Course name header */}
                <div className="flex items-baseline gap-2 px-1 mb-0.5">
                  <span className="text-xs font-bold text-foreground">{group.key}</span>
                  <span className="text-[11px] text-muted-foreground/60 truncate">{group.title}</span>
                </div>
                {/* Sections */}
                {group.sections.map((s) => {
                  const meta = TYPE_META[s.type];
                  return (
                    <div key={s.id}
                      className="grid gap-x-3 items-center px-1 py-0.5 rounded hover:bg-muted/25 transition-colors"
                      style={{ gridTemplateColumns: "6rem 2.5rem 2rem 3.5rem 7rem 1fr" }}>
                      <span /> {/* course col — blank, already in header */}
                      <span className="text-[11px] text-muted-foreground">{s.section}</span>
                      <span className={`text-[9px] font-semibold px-1 py-0 rounded w-fit ${meta.pill}`}>{meta.label}</span>
                      <span className="text-[11px] text-foreground/80 font-medium tabular-nums">{s.days}</span>
                      <span className="text-[11px] text-foreground/80 tabular-nums whitespace-nowrap">
                        {fmtTime(s.startHH, s.startMM)}–{fmtTime(s.endHH, s.endMM)}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">{s.location || "—"}</span>
                    </div>
                  );
                })}
                {/* Exams for this course */}
                {group.exams.map((e) => {
                  const meta = TYPE_META[e.type];
                  return (
                    <div key={e.id}
                      className="grid gap-x-3 items-center px-1 py-0.5 rounded hover:bg-muted/25 transition-colors"
                      style={{ gridTemplateColumns: "6rem 2.5rem 2rem 3.5rem 7rem 1fr" }}>
                      <span />
                      <span className="text-[11px] text-muted-foreground/50 col-span-1">{e.type === "MI" ? "Midterm" : "Final"}</span>
                      <span className={`text-[9px] font-semibold px-1 py-0 rounded w-fit ${meta.pill}`}>{meta.label}</span>
                      <span className="text-[11px] text-muted-foreground/80 whitespace-nowrap">{fmtDateShort(e.startDate)}</span>
                      <span className="text-[11px] text-foreground/80 tabular-nums whitespace-nowrap">
                        {fmtTime(e.startHH, e.startMM)}–{fmtTime(e.endHH, e.endMM)}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">{e.location || "—"}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
