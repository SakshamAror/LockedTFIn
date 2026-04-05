import { getSettings } from "@/components/SettingsPanel";
import type { WebRegCourse, CourseType } from "@/lib/browserUseWebReg";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL = 5000;

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

// Google Calendar event colors by course type
const GCal_COLOR: Record<CourseType, string> = {
  LE: "Blueberry",   // blue
  DI: "Sage",        // green
  LA: "Banana",      // amber/yellow
  SE: "Peacock",     // cyan
  MI: "Tomato",      // red
  FI: "Grape",       // deep rose
};

const TYPE_LABEL: Record<CourseType, string> = {
  LE: "Lecture",
  DI: "Discussion",
  LA: "Lab",
  SE: "Seminar",
  MI: "Midterm",
  FI: "Final",
};

const DAY_NAMES: Record<string, string> = {
  "1": "Monday",
  "2": "Tuesday",
  "3": "Wednesday",
  "4": "Thursday",
  "5": "Friday",
  "6": "Saturday",
  "7": "Sunday",
};

function fmt24(hh: number, mm: number) {
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function fmtDate(dateStr: string) {
  // "YYYY-MM-DD" → "Month Day, Year"
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function buildEventList(courses: WebRegCourse[]): string {
  const ONE_TIME: CourseType[] = ["FI", "MI"];
  const lines: string[] = [];

  for (const c of courses) {
    const label = `${c.subj} ${c.code} ${TYPE_LABEL[c.type]} (${c.section})`;
    const start = fmt24(c.startHH, c.startMM);
    const end = fmt24(c.endHH, c.endMM);
    const color = GCal_COLOR[c.type];
    const loc = c.location || "";
    const desc = c.instructor ? `Instructor: ${c.instructor}` : "";

    if (ONE_TIME.includes(c.type)) {
      if (!c.startDate) continue;
      lines.push(
        `- ONE-TIME EVENT: "${label}" | Date: ${fmtDate(c.startDate)} | Time: ${start}–${end} | Location: "${loc}" | Description: "${desc}" | Color: ${color}`
      );
    } else {
      const day = DAY_NAMES[c.dayCode];
      if (!day) continue;
      lines.push(
        `- WEEKLY RECURRING: "${label}" | Every ${day} | Time: ${start}–${end} | Location: "${loc}" | Description: "${desc}" | Color: ${color}`
      );
    }
  }

  return lines.join("\n");
}

export async function pushCoursesToCalendar(
  courses: WebRegCourse[],
  termName: string,
  signal?: AbortSignal
): Promise<number> {
  const { apiKey, email } = getSettings();

  if (!apiKey || !email) throw new Error("Please configure your API key and email in Settings first.");
  if (courses.length === 0) throw new Error("No courses to add.");

  const eventList = buildEventList(courses);
  const oneTimeCount = courses.filter((c) => ["FI", "MI"].includes(c.type)).length;
  const weeklyCount = courses.length - oneTimeCount;

  const task = `
Open Google Calendar for the account ${email} from composio connections.

Add the following class schedule for ${termName} to the calendar. Create EACH event listed below. Do NOT skip any.

IMPORTANT RULES:
- For WEEKLY RECURRING events: create a repeating event that recurs every week on the specified day. Set it to repeat for the rest of the academic term (until June 14, 2026 for Spring 2026).
- For ONE-TIME events: create a single event on the exact date shown.
- Apply the specified Color to each event using Google Calendar's color picker.
- Set the Location field for each event.
- Set the Description field for each event.
- After adding ALL events, confirm completion.

EVENTS TO ADD (${courses.length} total — ${weeklyCount} weekly, ${oneTimeCount} one-time):
${eventList}

Color reference in Google Calendar:
- Blueberry = dark blue
- Sage = muted green
- Banana = yellow
- Peacock = teal/cyan
- Tomato = red
- Grape = purple/dark rose

After creating all events, return the number of events successfully created as a plain integer.
`;

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
      const n = parseInt(String(result.output).trim(), 10);
      return isNaN(n) ? courses.length : n;
    }

    if (result.status === "stopped") return 0;
  }

  throw new Error("Push to calendar timed out after 10 minutes.");
}
