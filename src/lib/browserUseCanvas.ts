import { getSettings } from "@/components/SettingsPanel";
import { runBrowserTask, parseJsonArray, isRecord } from "@/lib/browserUseCore";

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

## STEP 2 — Duo 2FA (Do not end the session here or stop for next user input)
After login, you will be redirected to a Duo Security page at duosecurity.com.
A push notification is automatically sent to the user's phone.
Wait silently — poll the current URL every 2 seconds for up to 3 minutes.
Do NOT interact with the Duo page. Just wait until the URL changes away from duosecurity.com.

## STEP 3 — "Is this your device?" page (CRITICAL)
After Duo approval, you WILL land on a page asking "Is this your device?" or "Trust this browser?".
This page has TWO options:
  - A large primary button: "Yes, this is my device"
  - A smaller secondary link: "No, other people use this device"

YOU MUST CLICK: "No, other people use this device"
DO NOT click "Yes, this is my device" under any circumstances.

The "No" option may be:
- A plain text hyperlink (not a button)
- Inside a Duo iframe
- At the bottom of the page

Search the page AND all iframes for any element containing the text "other people use this device" and click it.
If it does not respond on first click, retry up to 5 times.
Do not continue until you have clicked this option.

## STEP 4 — Fetch assignments
Once on canvas.ucsd.edu, make these two API calls using the browser fetch:

Call 1: https://canvas.ucsd.edu/api/v1/planner/items?start_date=${today}&end_date=${end}&per_page=200
Call 2: https://canvas.ucsd.edu/api/v1/courses?enrollment_state=active&per_page=50&include[]=teachers&include[]=term

## STEP 5 — Return JSON
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

  return runBrowserTask(task, apiKey, {
    signal,
    timeoutMs: 10 * 60 * 1000,
    stopOnComplete: true,
    timeoutMsg: "Canvas fetch timed out after 10 minutes.",
    emptyResult: [],
    parseOutput,
  });
}

function parseOutput(output: unknown): CanvasAssignment[] {
  const items = parseJsonArray(output);

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
