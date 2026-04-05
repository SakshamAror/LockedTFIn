import { getSettings } from "@/components/SettingsPanel";

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

export interface GradescopeAssignment {
  id: number;
  title: string;
  course: string;
  instructor: string;
  dueDate: string;
  lateDueDate: string | null;
  points: string;
  submitted: boolean;
  graded: boolean;
  url: string;
  source: "gradescope";
}

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

export async function fetchGradescopeAssignments(
  signal?: AbortSignal,
  days: number = 14
): Promise<GradescopeAssignment[]> {
  const { apiKey, canvasUsername, canvasPassword } = getSettings();

  if (!apiKey) throw new Error("Please configure your Browser Use API key in Settings first.");
  if (!canvasUsername || !canvasPassword)
    throw new Error("Please enter your UCSD SSO credentials in Settings first.");

  const task = `
You are automating a browser to fetch Gradescope assignments. Follow these steps EXACTLY.

## STEP 1 — Login via SSO
Navigate to https://www.gradescope.com/saml
Wait for the page to load.
Find and click "UC San Diego" from the institution list.
Wait for the UCSD SSO login page.

## STEP 2 — UCSD SSO Login
If there is a dropdown/select with "Student SSO", select that option.
Fill the username field with: "${canvasUsername}"
Fill the password field with: "${canvasPassword}"
Click the login/submit button.
Wait for the page to load.

## STEP 3 — Duo 2FA
After login, you may be redirected to a Duo Security page.
A push notification is automatically sent to the user's phone.
Wait silently — poll the current URL every 2 seconds for up to 3 minutes.
If you see a "Yes, this is my device" or "Trust this browser" button, click it.
Wait until the URL changes to gradescope.com (not duosecurity.com).

## STEP 4 — Find current term courses
Navigate to https://www.gradescope.com/
Look for courses that contain "[SP26]" or "Spring 2026" in their name.
Collect all course IDs from links like /courses/{id}.

## STEP 5 — Scrape assignments from each course
For each course, navigate to https://www.gradescope.com/courses/{id}
Extract all assignments from the assignments table. For each assignment get:
- name/title
- course name (full name with course code)
- instructor name
- due date (from the <time> element with "Due" in aria-label)
- late due date (from the <time> element with "Late Due" in aria-label), if any
- status text (submitted, no submission, etc.)
- score (if graded)
- URL to the assignment

## STEP 6 — Return JSON
Return ONLY a raw JSON array (no markdown fences, no explanation) with objects:
{
  "title": string,
  "course": string,
  "instructor": string,
  "due_date": string (formatted as "Mon, Apr 07 2026 at 06:59 AM UTC", or "N/A"),
  "late_due_date": string or null,
  "points": string or "N/A",
  "submitted": boolean,
  "graded": boolean,
  "url": string
}

Sort by due_date ascending.
Only include assignments due within the next ${days} days from today, or assignments with no due date.
If login fails return: [{"error": "Invalid UCSD credentials."}]
`;

  const createRes = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
    },
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

    if (result.status === "timed_out") throw new Error("Timed out. Did you approve Duo on your phone?");
    if (result.status === "error" || result.isTaskSuccessful === false) {
      throw new Error(result.lastStepSummary || "Could not fetch Gradescope assignments.");
    }

    if (
      result.output !== null &&
      result.output !== undefined &&
      !(typeof result.output === "string" && result.output.trim() === "")
    ) {
      await stopSession(session.id, apiKey);
      return parseOutput(result.output);
    }

    if (result.status === "stopped") return [];
  }

  throw new Error("Gradescope fetch timed out after 10 minutes.");
}

function parseOutput(output: unknown): GradescopeAssignment[] {
  let items: unknown[];
  if (typeof output === "string") {
    const trimmed = output.trim();
    try {
      const parsed = JSON.parse(trimmed);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      const match = trimmed.match(/\[[\s\S]*\]/);
      if (!match) return [];
      items = JSON.parse(match[0]);
    }
  } else if (Array.isArray(output)) {
    items = output;
  } else {
    return [];
  }

  if (items.length === 1 && isRecord(items[0]) && items[0].error) {
    throw new Error(String(items[0].error));
  }

  return items
    .filter((item): item is Record<string, unknown> => isRecord(item) && !!item.title)
    .map((item, i) => ({
      id: i,
      title: String(item.title ?? "Untitled"),
      course: String(item.course ?? "Unknown Course"),
      instructor: String(item.instructor ?? "N/A"),
      dueDate: String(item.due_date ?? item.dueDate ?? "N/A"),
      lateDueDate: item.late_due_date ? String(item.late_due_date) : null,
      points: String(item.points ?? "N/A"),
      submitted: !!item.submitted,
      graded: !!item.graded,
      url: String(item.url ?? "#"),
      source: "gradescope" as const,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
