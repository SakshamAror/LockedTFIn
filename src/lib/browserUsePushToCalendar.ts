import { getSettings } from "@/components/SettingsPanel";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL = 5000;

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
  DI: "Sage",
  LA: "Banana",
  SE: "Peacock",
  MI: "Tomato",
  FI: "Grape",
};

const TYPE_LABEL: Record<CourseType, string> = {
  LE: "Lecture",
  DI: "Discussion",
  LA: "Lab",
  SE: "Seminar",
  MI: "Midterm",
  FI: "Final",
};

const DAY_ORDER = ["1", "2", "3", "4", "5", "6", "7"];
const DAY_NAMES: Record<string, string> = {
  "1": "Monday", "2": "Tuesday", "3": "Wednesday",
  "4": "Thursday", "5": "Friday", "6": "Saturday", "7": "Sunday",
};

function fmt24(hh: number, mm: number) {
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function fmtDateLong(dateStr: string) {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

interface CourseEvent {
  num: number;
  kind: "WEEKLY" | "ONE-TIME";
  title: string;
  days?: string;       // "Monday, Wednesday, Friday"
  date?: string;       // "Friday, June 12, 2026"
  startTime: string;   // "11:00"
  endTime: string;     // "11:50"
  location: string;
  description: string;
  color: string;
}

function buildCourseEvents(courses: WebRegCourse[]): CourseEvent[] {
  const ONE_TIME: CourseType[] = ["FI", "MI"];
  const events: CourseEvent[] = [];

  // ── Weekly: deduplicate and merge days by section key ────────────────────
  const sectionMap = new Map<string, { course: WebRegCourse; dayCodes: Set<string> }>();
  const examMap = new Map<string, WebRegCourse>();

  for (const c of courses) {
    if (ONE_TIME.includes(c.type)) {
      // Deduplicate exams by subj+code+type+startDate
      const examKey = `${c.subj}|${c.code}|${c.type}|${c.startDate ?? ""}`;
      if (!examMap.has(examKey)) examMap.set(examKey, c);
      continue;
    }
    const key = `${c.subj}|${c.code}|${c.section}|${c.type}`;
    if (!sectionMap.has(key)) sectionMap.set(key, { course: c, dayCodes: new Set() });
    if (c.dayCode) sectionMap.get(key)!.dayCodes.add(c.dayCode);
  }

  let num = 1;

  for (const { course: c, dayCodes } of sectionMap.values()) {
    const days = DAY_ORDER
      .filter((d) => dayCodes.has(d))
      .map((d) => DAY_NAMES[d])
      .join(", ");
    if (!days) continue;

    events.push({
      num: num++,
      kind: "WEEKLY",
      title: `${c.subj} ${c.code} ${TYPE_LABEL[c.type]} (${c.section})`,
      days,
      startTime: fmt24(c.startHH, c.startMM),
      endTime: fmt24(c.endHH, c.endMM),
      location: c.location || "",
      description: c.instructor ? `Instructor: ${c.instructor}` : "",
      color: GCAL_COLOR[c.type],
    });
  }

  for (const c of examMap.values()) {
    if (!c.startDate) continue;
    events.push({
      num: num++,
      kind: "ONE-TIME",
      title: `${c.subj} ${c.code} ${TYPE_LABEL[c.type]}`,
      date: fmtDateLong(c.startDate),
      startTime: fmt24(c.startHH, c.startMM),
      endTime: fmt24(c.endHH, c.endMM),
      location: c.location || "",
      description: c.instructor ? `Instructor: ${c.instructor}` : "",
      color: GCAL_COLOR[c.type],
    });
  }

  return events;
}

export async function pushCoursesToCalendar(
  courses: WebRegCourse[],
  termName: string,
  signal?: AbortSignal
): Promise<number> {
  const { apiKey, email } = getSettings();
  if (!apiKey || !email) throw new Error("Please configure your API key and email in Settings first.");
  if (courses.length === 0) throw new Error("No courses to add.");

  const events = buildCourseEvents(courses);
  const weeklyCount = events.filter((e) => e.kind === "WEEKLY").length;
  const examCount = events.filter((e) => e.kind === "ONE-TIME").length;
  const total = events.length;

  // Format as a numbered list so the AI knows exactly how many events to create
  const eventLines = events.map((e) => {
    if (e.kind === "WEEKLY") {
      return [
        `EVENT ${e.num} of ${total} [WEEKLY RECURRING]`,
        `  Title:       ${e.title}`,
        `  Days:        ${e.days}`,
        `  Start time:  ${e.startTime}`,
        `  End time:    ${e.endTime}`,
        `  Location:    ${e.location || "none"}`,
        `  Description: ${e.description || "none"}`,
        `  Color:       ${e.color}`,
        `  Repeat until: June 14, 2026`,
      ].join("\n");
    } else {
      return [
        `EVENT ${e.num} of ${total} [ONE-TIME]`,
        `  Title:       ${e.title}`,
        `  Date:        ${e.date}`,
        `  Start time:  ${e.startTime}`,
        `  End time:    ${e.endTime}`,
        `  Location:    ${e.location || "none"}`,
        `  Description: ${e.description || "none"}`,
        `  Color:       ${e.color}`,
      ].join("\n");
    }
  }).join("\n\n");

  const task = `Open Google Calendar for the account ${email} from composio connections.

You must create exactly ${total} calendar events for ${termName}. The list below is already deduplicated — do NOT create any event more than once.

RULES:
1. WEEKLY RECURRING events: create ONE event that repeats on ALL listed days every week until June 14, 2026. Do NOT create separate events for each day.
2. ONE-TIME events: create a single event on the exact date listed.
3. After creating each event, open the event color picker and select the exact color name shown (these are Google Calendar's built-in color names).
4. Fill in Location and Description exactly as shown.
5. Create the events one by one in order. After finishing all ${total}, stop.

COLOR REFERENCE (Google Calendar built-in names):
- Blueberry = blue (lectures)
- Sage = green (discussions)
- Banana = yellow (labs)
- Peacock = teal (seminars)
- Tomato = red (midterms)
- Grape = purple (finals)

EVENTS (${total} total: ${weeklyCount} weekly, ${examCount} one-time):

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

    if (result.status === "timed_out") throw new Error("Timed out while adding calendar events.");
    if (result.status === "error" || result.isTaskSuccessful === false)
      throw new Error(result.lastStepSummary || "Could not add events to Google Calendar.");

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

  throw new Error("Push to calendar timed out after 10 minutes.");
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
