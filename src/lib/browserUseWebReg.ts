import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL = 5000;

export type CourseType = "LE" | "DI" | "LA" | "SE" | "FI" | "MI";

export interface WebRegCourse {
  id: string;
  subj: string;
  code: string;
  title: string;
  section: string;
  type: CourseType;
  dayCode: string; // "1"=Mon … "7"=Sun
  startHH: number;
  startMM: number;
  endHH: number;
  endMM: number;
  location: string;
  instructor: string;
  startDate?: string; // "YYYY-MM-DD" only for FI/MI
}

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

export async function fetchWebRegSchedule(
  signal?: AbortSignal,
  termCode = "SP26"
): Promise<WebRegCourse[]> {
  const { apiKey, canvasUsername, canvasPassword } = getSettings();

  if (!apiKey) throw new Error("Please configure your Browser Use API key in Settings first.");
  if (!canvasUsername || !canvasPassword)
    throw new Error("Please enter your UCSD SSO credentials in Settings first.");

  const task = `
You are automating a browser to fetch a UCSD WebReg class schedule. Follow these steps EXACTLY.

## STEP 1 — Navigate to WebReg
Go to https://act.ucsd.edu/webreg2/start

## STEP 2 — Login
Fill the text/username input with: "${canvasUsername}"
Fill the password input with: "${canvasPassword}"
Click the submit/login button.

## STEP 3 — Duo 2FA
After login you will be on a Duo Security page at duosecurity.com.
A push notification is automatically sent to the user's phone.
Wait silently — poll the current URL every 2 seconds for up to 3 minutes.
Do NOT interact with the Duo page. Just wait until the URL changes away from duosecurity.com.

## STEP 4 — "Is this your device?" prompt
After Duo approval you WILL see a page asking "Is this your device?".
YOU MUST CLICK: "No, other people use this device"
Search the page AND all iframes for this text. If it doesn't respond on first click, retry up to 5 times.
Do not continue until you have clicked that option.

## STEP 5 — Select term
Wait for the selector: select#startpage-select-term (timeout 15 s).
Select the option whose value contains "${termCode}".
Click the Go button: input#startpage-button-go or button#startpage-button-go.
Wait for the URL to contain "webreg2/main".

## STEP 6 — Fetch schedule via API
Using the browser's fetch() API, make this GET request:
https://act.ucsd.edu/webreg2/svc/wradapter/secure/get-class?termcode=${termCode}&schedname=My+Schedule&final=false&sectnum=

## STEP 7 — Return data
Return ONLY a raw JSON array (no markdown, no prose) of the raw API response objects.
Each object will have fields including: SUBJ_CODE, CRSE_CODE, CRSE_TITLE, SECT_CODE,
FK_CDI_INSTR_TYPE (LE/DI/LA/SE/FI/MI), DAY_CODE (1=Mon…7=Sun),
BEGIN_HH_TIME, BEGIN_MM_TIME, END_HH_TIME, END_MM_TIME,
BLDG_CODE, ROOM_CODE, PERSON_FULL_NAME, START_DATE (for exams only).

If login fails return: [{"error": "Invalid UCSD credentials."}]
If no classes found return: []
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

    if (result.status === "timed_out") throw new Error("Timed out. Did you approve Duo on your phone?");
    if (result.status === "error" || result.isTaskSuccessful === false)
      throw new Error(result.lastStepSummary || "Could not fetch WebReg schedule.");

    if (
      result.output !== null &&
      result.output !== undefined &&
      !(typeof result.output === "string" && result.output.trim() === "")
    ) {
      return parseOutput(result.output);
    }

    if (result.status === "stopped") return [];
  }

  throw new Error("WebReg fetch timed out after 10 minutes.");
}

function parseOutput(output: unknown): WebRegCourse[] {
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

  // Deduplicate: API emits one record per meeting day
  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const key = `${item.SECTION_NUMBER}|${item.FK_CDI_INSTR_TYPE}|${item.DAY_CODE ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped
    .filter((item) => !!item.FK_CDI_INSTR_TYPE)
    .map((item, i): WebRegCourse => ({
      id: String(i),
      subj: String(item.SUBJ_CODE ?? "").trim(),
      code: String(item.CRSE_CODE ?? "").trim(),
      title: String(item.CRSE_TITLE ?? "").trim(),
      section: String(item.SECT_CODE ?? "").trim(),
      type: String(item.FK_CDI_INSTR_TYPE ?? "LE").trim() as CourseType,
      dayCode: String(item.DAY_CODE ?? ""),
      startHH: Number(item.BEGIN_HH_TIME ?? 0),
      startMM: Number(item.BEGIN_MM_TIME ?? 0),
      endHH: Number(item.END_HH_TIME ?? 0),
      endMM: Number(item.END_MM_TIME ?? 0),
      location: `${String(item.BLDG_CODE ?? "").trim()} ${String(item.ROOM_CODE ?? "").trim()}`.trim(),
      instructor: String(item.PERSON_FULL_NAME ?? "").trim(),
      startDate: item.START_DATE ? String(item.START_DATE) : undefined,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
