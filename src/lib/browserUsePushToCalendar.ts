import { getSettings } from "@/components/SettingsPanel";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";
import { runBrowserTask, isRecord } from "@/lib/browserUseCore";

/**
 * Google Calendar color IDs:
 * 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana,
 * 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
 */
export const EVENT_COLORS = {
  lecture:    { id: "9",  label: "Blueberry",  hex: "#3F51B5" },
  lab:        { id: "10", label: "Basil",      hex: "#0B8043" },
  discussion: { id: "5",  label: "Banana",     hex: "#F6BF26" },
  final:      { id: "11", label: "Tomato",     hex: "#D50000" },
  midterm:    { id: "6",  label: "Tangerine",  hex: "#F4511E" },
  review:     { id: "8",  label: "Graphite",   hex: "#616161" },
  other:      { id: "1",  label: "Lavender",   hex: "#7986CB" },
  assignment: { id: "3",  label: "Grape",      hex: "#8E24AA" },
} as const;

// Map day abbreviations to RRULE BYDAY values
const DAY_MAP: Record<string, string> = {
  M: "MO", Mo: "MO", Mon: "MO",
  Tu: "TU", Tue: "TU", T: "TU",
  W: "WE", We: "WE", Wed: "WE",
  Th: "TH", Thu: "TH", R: "TH",
  F: "FR", Fr: "FR", Fri: "FR",
  Sa: "SA", Sat: "SA", S: "SA",
  Su: "SU", Sun: "SU",
};

function parseDaysToRruleDays(dayCode: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < dayCode.length) {
    // Try two-char match first
    if (i + 1 < dayCode.length) {
      const twoChar = dayCode.substring(i, i + 2);
      if (DAY_MAP[twoChar]) {
        result.push(DAY_MAP[twoChar]);
        i += 2;
        continue;
      }
    }
    const oneChar = dayCode[i];
    if (DAY_MAP[oneChar]) {
      result.push(DAY_MAP[oneChar]);
    }
    i++;
  }
  return result;
}

export interface SyncResult {
  created: number;
  failed: number;
  errors: string[];
}

const GCAL_COLOR: Record<CourseType, string> = {
  LE: "Blueberry",
  DI: "Banana",
  LA: "Basil",
  SE: "Peacock",
  MI: "Tangerine",
  FI: "Tomato",
};

const TYPE_LABEL: Record<CourseType, string> = {
  LE: "Lecture",
  DI: "Discussion",
  LA: "Lab",
  SE: "Seminar",
  MI: "Midterm",
  FI: "Final",
};

function fmt24(hh: number, mm: number) {
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Course push ───────────────────────────────────────────────────────────────

export async function pushCoursesToCalendar(
  courses: WebRegCourse[],
  termName: string,
  signal?: AbortSignal
): Promise<SyncResult> {
  const { apiKey, email } = getSettings();
  if (!apiKey || !email) throw new Error("Please configure your API key and email in Settings first.");
  if (courses.length === 0) throw new Error("No courses to add.");

  const classInstructions: string[] = [];
  let eventIndex = 0;

  // Find the latest final exam date per course to set recurrence end date
  const courseFinalDate: Record<string, string> = {};
  for (const c of courses) {
    if (c.type === "FI" && c.startDate) {
      const course = `${c.subj}${c.code}`;
      if (!courseFinalDate[course] || c.startDate > courseFinalDate[course]) {
        courseFinalDate[course] = c.startDate;
      }
    }
  }

  // Deduplicate by section key: one event per course+section+type combination
  const sectionMap = new Map<string, { course: WebRegCourse; dayCodes: Set<string> }>();
  const examMap = new Map<string, WebRegCourse>();

  for (const c of courses) {
    if (c.type === "FI" || c.type === "MI") {
      // Deduplicate exams by course+type+startDate
      const examKey = `${c.subj}${c.code}|${c.type}|${c.startDate ?? ""}`;
      if (!examMap.has(examKey)) examMap.set(examKey, c);
      continue;
    }

    // For weekly events: group by section
    const key = `${c.subj}|${c.code}|${c.section}|${c.type}`;
    if (!sectionMap.has(key)) sectionMap.set(key, { course: c, dayCodes: new Set() });
    if (c.dayCode) sectionMap.get(key)!.dayCodes.add(c.dayCode);
  }

  // Build instructions for weekly classes
  for (const { course: c, dayCodes } of sectionMap.values()) {
    if (dayCodes.size === 0) continue;

    const rruleDays = Array.from(dayCodes)
      .flatMap((d) => parseDaysToRruleDays(d))
      .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
      .sort()
      .join(",");

    if (!rruleDays) continue;

    const colorId = (EVENT_COLORS[c.type.toLowerCase() as keyof typeof EVENT_COLORS]?.id) ?? "1";
    const course = `${c.subj} ${c.code}`;
    const title = `${course} ${TYPE_LABEL[c.type]} (${c.section})`;
    const location = c.location || "";
    const description = c.instructor ? `Instructor: ${c.instructor}` : "";
    const startTime = fmt24(c.startHH, c.startMM);
    const endTime = fmt24(c.endHH, c.endMM);
    const startDate = fmtDate(c.startDate ?? new Date().toISOString().slice(0, 10));
    const finalDate = courseFinalDate[`${c.subj}${c.code}`];
    const untilDate = finalDate ? dayBefore(finalDate) : startDate;

    eventIndex++;
    classInstructions.push(
      `Event ${eventIndex}: Create a WEEKLY RECURRING event titled "${title}" ` +
      `starting ${startDate}, repeating every week on ${rruleDays} until ${untilDate}. ` +
      `Time: ${startTime} - ${endTime}. ` +
      `Location: "${location}". ` +
      `Description: "${description}". ` +
      `Color ID: ${colorId}. Timezone: America/Los_Angeles. ` +
      `Use RRULE: FREQ=WEEKLY;BYDAY=${rruleDays};UNTIL=${untilDate.replace(/-/g, "")}T235959Z`
    );
  }

  // Build instructions for exams (one-time events)
  for (const c of examMap.values()) {
    if (!c.startDate) continue;

    const colorId = (EVENT_COLORS[c.type.toLowerCase() as keyof typeof EVENT_COLORS]?.id) ?? "1";
    const course = `${c.subj} ${c.code}`;
    const title = `${course} ${TYPE_LABEL[c.type]}`;
    const location = c.location || "";
    const description = c.instructor ? `Instructor: ${c.instructor}` : "";
    const startTime = fmt24(c.startHH, c.startMM);
    const endTime = fmt24(c.endHH, c.endMM);
    const examDate = fmtDate(c.startDate);

    eventIndex++;
    classInstructions.push(
      `Event ${eventIndex}: Create a ONE-TIME event titled "${title}" ` +
      `on ${examDate}. ` +
      `Time: ${startTime} - ${endTime}. ` +
      `Location: "${location}". ` +
      `Description: "${description}". ` +
      `Color ID: ${colorId}. Timezone: America/Los_Angeles.`
    );
  }

  if (classInstructions.length === 0) {
    return { created: 0, failed: 0, errors: ["No courses to add."] };
  }

  return runSyncSession(
    apiKey,
    email,
    `Create ALL of the following ${classInstructions.length} CLASS events on Google Calendar.\n\n${classInstructions.join("\n\n")}`,
    classInstructions.length,
    signal
  );
}

// ── Assignments push ──────────────────────────────────────────────────────────

export interface PushableAssignment {
  title: string;
  course: string;
  dueDate: string;
  points: string;
  url: string;
  source: "canvas" | "gradescope";
  type?: string;
}

function assignmentColor(a: PushableAssignment): string {
  if (a.source === "gradescope") return "3"; // Grape
  switch (a.type) {
    case "quiz": return "5"; // Banana
    case "discussion_topic": return "7"; // Peacock
    default: return "9"; // Blueberry
  }
}

export async function pushAssignmentsToCalendar(
  assignments: PushableAssignment[],
  signal?: AbortSignal
): Promise<SyncResult> {
  const { apiKey, email } = getSettings();
  if (!apiKey || !email) throw new Error("Please configure your API key and email in Settings first.");
  if (assignments.length === 0) throw new Error("No assignments to add.");

  // Deduplicate by title+dueDate
  const seen = new Set<string>();
  const deduped = assignments.filter((a) => {
    const key = `${a.title}|${a.dueDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const total = deduped.length;
  const assignmentInstructions: string[] = [];

  for (let i = 0; i < deduped.length; i++) {
    const a = deduped[i];
    if (!a.dueDate || a.dueDate === "N/A" || a.dueDate.trim() === "") continue;

    const colorId = assignmentColor(a);
    const desc = `Course: ${a.course}${a.points !== "N/A" ? ` | Points: ${a.points}` : ""}${a.url ? ` | URL: ${a.url}` : ""}`;

    assignmentInstructions.push(
      `Assignment ${i + 1}: Create a ONE-TIME 2-minute event titled "📝 ${a.title}" ` +
      `at the due date/time: ${a.dueDate}. ` +
      `Set end time = start time + 2 minutes. ` +
      `Description: "${desc}". ` +
      `Color ID: ${colorId}. Timezone: America/Los_Angeles.`
    );
  }

  if (assignmentInstructions.length === 0) {
    return { created: 0, failed: 0, errors: ["No assignments to add."] };
  }

  return runSyncSession(
    apiKey,
    email,
    `Create ALL of the following ${assignmentInstructions.length} ASSIGNMENT events on Google Calendar. Each is a one-time 2-minute event.\n\n${assignmentInstructions.join("\n\n")}`,
    assignmentInstructions.length,
    signal
  );
}

// ── Session management ─────────────────────────────────────────────────────────

async function runSyncSession(
  apiKey: string,
  email: string,
  eventBlock: string,
  expectedCount: number,
  signal?: AbortSignal
): Promise<SyncResult> {
  const task = `
You are automating a browser to create Google Calendar events using the composio-connected Google Calendar for ${email}.

${eventBlock}

IMPORTANT RULES:
- For recurring events, use the RRULE format in the recurrence field
- For one-time events, just set start and end times
- Color ID must be set for each event
- All times are in America/Los_Angeles timezone
- For 2-minute events, set end time = start time + 2 minutes
- You MUST create EVERY event listed above. Do NOT skip any.

After creating all events, return a JSON object:
{
  "created": number (how many events were successfully created),
  "failed": number (how many failed),
  "errors": string[] (error messages for any that failed)
}

No markdown, no explanation, just the JSON object.
`;

  return runBrowserTask(task, apiKey, {
    signal,
    timeoutMs: 10 * 60 * 1000,
    timedOutMsg: "Calendar sync timed out.",
    timeoutMsg: "Calendar sync timed out after 10 minutes.",
    emptyResult: { created: 0, failed: expectedCount, errors: ["Session stopped unexpectedly."] },
    parseOutput: (output) => parseSyncResult(output, expectedCount),
  });
}

function parseSyncResult(output: unknown, total: number): SyncResult {
  let obj: Record<string, unknown> | null = null;

  if (typeof output === "string") {
    try {
      obj = JSON.parse(output.trim());
    } catch {
      const match = output.match(/\{[\s\S]*\}/);
      if (match) {
        try { obj = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }
  } else if (isRecord(output)) {
    obj = output;
  }

  if (obj && typeof obj.created === "number") {
    return {
      created: obj.created as number,
      failed: (obj.failed as number) ?? 0,
      errors: Array.isArray(obj.errors) ? obj.errors.map(String) : [],
    };
  }

  // If we can't parse, assume success
  return { created: total, failed: 0, errors: [] };
}
