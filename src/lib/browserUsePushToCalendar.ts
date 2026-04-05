import { getSettings } from "@/components/SettingsPanel";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL = 5000;

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

async function stopSession(sessionId: string, apiKey: string) {
  try {
    await fetch(`${BASE_URL}/sessions/${sessionId}/stop`, {
      method: "PUT",
      headers: { "X-Browser-Use-API-Key": apiKey },
    });
  } catch { /* best-effort */ }
}

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

// ── Course push ───────────────────────────────────────────────────────────────

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
    const untilDate = finalDate ? dayBefore(finalDate) : (c.endDate ? fmtDate(c.endDate) : startDate);

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
  if (a.source === "gradescope") return "Sage";
  switch (a.type) {
    case "quiz": return "Banana";
    case "discussion_topic": return "Peacock";
    default: return "Blueberry";
  }
}

export async function pushAssignmentsToCalendar(
  assignments: PushableAssignment[],
  signal?: AbortSignal
): Promise<number> {
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

  const eventLines = deduped.map((a, i) => {
    const color = assignmentColor(a);
    const desc = `Course: ${a.course}${a.points !== "N/A" ? ` | Points: ${a.points}` : ""}${a.url ? ` | URL: ${a.url}` : ""}`;
    return [
      `ASSIGNMENT ${i + 1} of ${total}`,
      `  Title:    ${a.title}`,
      `  Due:      ${a.dueDate}`,
      `  Desc:     ${desc}`,
      `  Color:    ${color}`,
    ].join("\n");
  }).join("\n\n");

  const task = `Open Google Calendar for the account ${email} from composio connections.

You must create exactly ${total} calendar events for assignment deadlines. The list is already deduplicated — do NOT create any event more than once.

RULES:
1. Each event must be exactly 1 minute long, starting AT the due time (e.g. due 11:59 PM → event is 11:59 PM to 12:00 AM).
2. If the due time has no time component, create an all-day event on the due date.
3. If there is no date at all, skip that assignment.
4. After creating each event, open the color picker and select the exact color name shown.
5. Set the Description field exactly as shown.
6. Do NOT prefix the title with "Due:" — use the title exactly as listed.
7. Create events one by one in order. After all ${total} are done, stop.

COLOR REFERENCE (Google Calendar built-in names):
- Blueberry = blue (Canvas assignments)
- Banana = yellow (Canvas quizzes)
- Peacock = teal (Canvas discussions)
- Sage = green (Gradescope)

ASSIGNMENTS (${total} total):

${eventLines}

When done, return only the number of events created as a plain integer.`;

  const createRes = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "X-Browser-Use-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ task }),
    signal,
  });

  if (!createRes.ok) {
    const status = createRes.status;
    if (status === 401 || status === 403) throw new Error("Invalid Browser Use API key.");
    if (status === 429) throw new Error("Rate limited. Please wait and try again.");
    throw new Error(`Failed to create session (HTTP ${status}).`);
  }

  const session: BrowserUseSession = await createRes.json();
  if (!session.id) throw new Error("No session ID returned from Browser Use.");

  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    signal?.throwIfAborted();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const pollRes = await fetch(`${BASE_URL}/sessions/${session.id}`, {
      headers: { "X-Browser-Use-API-Key": apiKey },
      signal,
    });
    if (!pollRes.ok) throw new Error(`Poll failed (HTTP ${pollRes.status}).`);

    const result: BrowserUseSession = await pollRes.json();

    if (result.status === "timed_out") throw new Error("Timed out while adding assignment events.");
    if (result.status === "error" || result.isTaskSuccessful === false)
      throw new Error(result.lastStepSummary || "Could not add assignments to Google Calendar.");

    if (
      result.output !== null &&
      result.output !== undefined &&
      !(typeof result.output === "string" && result.output.trim() === "")
    ) {
      await stopSession(session.id, apiKey);
      const n = parseInt(String(result.output).trim(), 10);
      return isNaN(n) ? total : n;
    }

    if (result.status === "stopped") return 0;
  }

  throw new Error("Push assignments timed out after 10 minutes.");
}
