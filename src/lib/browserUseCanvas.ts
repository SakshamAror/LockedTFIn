import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 10 * 60 * 1000; // 10 min (SSO + Duo can be slow)
const POLL_INTERVAL = 5000;

export interface CanvasAssignment {
  id: number;
  title: string;
  type: string;
  course: string;
  professor: string;
  dueDate: string;
  points: string;
  submitted: boolean;
  graded: boolean;
  url: string;
}

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

export async function fetchCanvasAssignments(signal?: AbortSignal): Promise<CanvasAssignment[]> {
  const { apiKey, canvasUsername, canvasPassword } = getSettings();

  if (!apiKey) {
    throw new Error("Please configure your Browser Use API key in Settings first.");
  }

  if (!canvasUsername || !canvasPassword) {
    throw new Error("Please enter your UCSD Canvas SSO username and password in Settings first.");
  }

  const task = `
Go to https://canvas.ucsd.edu and log in using UCSD SSO.
- On the SSO login page, enter username: "${canvasUsername}" and password: "${canvasPassword}"
- Click the login/submit button
- Wait for Duo 2FA — the user will approve the push notification on their phone (wait up to 2 minutes)
- If an option appears to press a link for "No, other people use this device", press it.
- Once logged into Canvas, use the browser to call this API endpoint: https://canvas.ucsd.edu/api/v1/planner/items?start_date=2026-01-01&end_date=2026-12-31&per_page=200
- Also call: https://canvas.ucsd.edu/api/v1/courses?enrollment_state=active&per_page=50&include[]=teachers&include[]=term

From the planner items, filter only items where plannable_type is "assignment", "quiz", or "discussion_topic".
Get all planner items withing 7 days from today and return them.

Return ONLY a valid JSON array with objects having these fields:
- title (string)
- type (string: "assignment", "quiz", or "discussion_topic")
- course (string: the course name)
- professor (string: the teacher/professor name, "N/A" if unknown)
- due_date (string like "Mon, Apr 7 2026 at 11:59 PM UTC", or "N/A")
- points (string or number, "N/A" if not applicable)
- submitted (boolean)
- graded (boolean)
- url (string: full Canvas URL to the item)

Sort by due_date ascending. No markdown, no explanation, just the JSON array.

IMPORTANT: If the SSO credentials are wrong or login fails, return exactly this JSON: [{"error": "Invalid UCSD credentials. Please check your username and password in Settings."}]
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

    if (result.status === "timed_out") {
      throw new Error("Browser Use timed out. Duo 2FA may not have been approved in time.");
    }

    if (result.status === "error" || result.isTaskSuccessful === false) {
      throw new Error(
        result.lastStepSummary || "Could not fetch Canvas assignments. Please verify your credentials in Settings.",
      );
    }

    if (
      result.output !== null &&
      result.output !== undefined &&
      !(typeof result.output === "string" && result.output.trim() === "")
    ) {
      return parseCanvasOutput(result.output);
    }

    if (result.status === "stopped") return [];
  }

  throw new Error("Canvas fetch timed out after 10 minutes.");
}

function parseCanvasOutput(output: unknown): CanvasAssignment[] {
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

  // Check for error response from the agent
  if (items.length === 1 && isRecord(items[0]) && items[0].error) {
    throw new Error(String(items[0].error));
  }

  return items
    .filter((item): item is Record<string, any> => isRecord(item) && !!item.title)
    .map((item, i) => ({
      id: i,
      title: item.title || "Untitled",
      type: item.type || "assignment",
      course: item.course || "Unknown Course",
      professor: item.professor || "N/A",
      dueDate: item.due_date || item.dueDate || "N/A",
      points: String(item.points ?? "N/A"),
      submitted: !!item.submitted,
      graded: !!item.graded,
      url: item.url || "#",
    }));
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}
