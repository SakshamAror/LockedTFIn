import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 10 * 60 * 1000;
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

export async function fetchCanvasAssignments(signal?: AbortSignal, days: number = 14): Promise<CanvasAssignment[]> {
  const { apiKey, canvasUsername, canvasPassword } = getSettings();

  if (!apiKey) throw new Error("Please configure your Browser Use API key in Settings first.");
  if (!canvasUsername || !canvasPassword)
    throw new Error("Please enter your UCSD Canvas SSO username and password in Settings first.");

  const today = new Date().toISOString().split("T")[0];
  const end = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

  const task = `
You are automating a browser to fetch Canvas assignments. Follow these steps EXACTLY.

## STEP 1 — Login
Navigate to https://canvas.ucsd.edu
Fill username: "${canvasUsername}"
Fill password: "${canvasPassword}"
Click the login/submit button.

## STEP 2 — Duo 2FA + Device Trust (handle as one continuous phase, don't end the session or wait for next user input)
After login you will be redirected to a Duo Security page at duosecurity.com.
A push notification is automatically sent to the user's phone. DO NOT interact with the Duo page at all — do not click anything on it.

Poll the page every 2 seconds for up to 3 minutes. On each poll, check for BOTH of these conditions simultaneously:

  Condition A — The URL has changed away from duosecurity.com entirely.
  Condition B — Any element on the page (including inside iframes) contains the text "other people use this device" or "No, other people use this device".

If Condition B becomes true at ANY point (even while still on duosecurity.com), immediately click that element. It may appear as:
  - A plain anchor/hyperlink (not a styled button)
  - Text inside a Duo iframe
  - A small secondary option below a larger primary "Yes" button

After clicking, verify the element was actually activated. If the page does not change within 3 seconds, retry the click up to 5 times.

DO NOT click "Yes, this is my device" under any circumstances.
DO NOT move on to Step 3 until you have successfully clicked the "No" option AND the browser has fully navigated to canvas.ucsd.edu.

## STEP 3 — Fetch assignments
Once you have confirmed you are on canvas.ucsd.edu, make these two API calls using the browser fetch:

Call 1: https://canvas.ucsd.edu/api/v1/planner/items?start_date=${today}&end_date=${end}&per_page=200
Call 2: https://canvas.ucsd.edu/api/v1/courses?enrollment_state=active&per_page=50&include[]=teachers&include[]=term

## STEP 4 — Return JSON
From the planner items, keep only plannable_type = "assignment", "quiz", or "discussion_topic".
Build a course map from Call 2 (course id → name + teacher).
Return ONLY a raw JSON array (no markdown, no explanation) with objects:
{
  "title": string,
  "type": string,
  "course": string,
  "professor": string,
  "due_date": string (e.g. "Mon, Apr 07 2026 at 06:59 AM UTC", or "N/A"),
  "points": string or number,
  "submitted": boolean,
  "graded": boolean,
  "url": string
}

Sort by due_date ascending.
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
      throw new Error(result.lastStepSummary || "Could not fetch Canvas assignments.");
    }

    if (
      result.output !== null &&
      result.output !== undefined &&
      !(typeof result.output === "string" && result.output.trim() === "")
    ) {
      return parseOutput(result.output);
    }

    if (result.status === "stopped") return [];
  }

  throw new Error("Canvas fetch timed out after 10 minutes.");
}

function parseOutput(output: unknown): CanvasAssignment[] {
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
      type: String(item.type ?? "assignment"),
      course: String(item.course ?? "Unknown Course"),
      professor: String(item.professor ?? "N/A"),
      dueDate: String(item.due_date ?? item.dueDate ?? "N/A"),
      points: String(item.points ?? "N/A"),
      submitted: !!item.submitted,
      graded: !!item.graded,
      url: String(item.url ?? "#"),
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
