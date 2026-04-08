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
  } catch {
    /* best-effort */
  }
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
  days: number = 14,
): Promise<GradescopeAssignment[]> {
  const { apiKey, canvasUsername, canvasPassword } = getSettings();

  if (!apiKey) throw new Error("Please configure your Browser Use API key in Settings first.");
  if (!canvasUsername || !canvasPassword) throw new Error("Please enter your UCSD SSO credentials in Settings first.");

  const task = `
Login to Gradescope via SSO:
1. Go to https://www.gradescope.com/saml, select "UC San Diego", complete UCSD SSO login with username "${canvasUsername}" / password "${canvasPassword}". If a "Student SSO" dropdown exists, select it first.
2. On Duo 2FA page: a push is auto-sent — poll URL every 2s up to 3min until redirected to gradescope.com. Click "Yes, this is my device" / "Trust this browser" if shown.
3. If login fails, return: [{"error": "Invalid UCSD credentials."}]

Scrape assignments:
4. Go to https://www.gradescope.com/, collect all course IDs from /courses/{id} links where course name contains "[SP26]" or "Spring 2026".
5. For each course, go to https://www.gradescope.com/courses/{id} and extract all assignments. Per assignment capture: title, full course name, instructor, due date (<time> with aria-label "Due..."), late due date (<time> with aria-label "Late Due...") or null, status, score, and URL.

Return ONLY a raw JSON array (no markdown, no explanation), sorted by due_date ascending, including only assignments due within ${days} days from today or with no due date:
[{"title":string,"course":string,"instructor":string,"due_date":"Mon, Apr 07 2026 at 06:59 AM UTC" or "N/A","late_due_date":string|null,"points":string|"N/A","submitted":boolean,"graded":boolean,"url":string}]
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
