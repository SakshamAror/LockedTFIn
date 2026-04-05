import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 8 * 60 * 1000;
const POLL_INTERVAL = 5000;

export interface CalendarEvent {
  id: string;
  summary: string;
  date: string;
  time: string;
  duration?: string;
  location?: string;
}

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

export async function fetchCalendarEvents(signal?: AbortSignal, days: number = 7): Promise<CalendarEvent[]> {
  const { apiKey, email } = getSettings();

  if (!apiKey || !email) {
    throw new Error("Please configure your API key and email in Settings first.");
  }

  const today = new Date();
  const endDate = new Date(today.getTime() + days * 86400000);
  const todayStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const createRes = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: `Go to Google Calendar for the account ${email} from composio connections and get ALL events from ${todayStr} through ${endStr} (the next ${days} day${days !== 1 ? "s" : ""}). Return ONLY a valid JSON array with objects having these fields: summary (string - event title), date (string like "Mon, Apr 7"), time (string like "9:00 AM - 10:00 AM"), duration (string like "1 hour"), location (string, empty if none). No markdown, no explanation, just the JSON array.`,
    }),
    signal,
  });

  if (!createRes.ok) {
    const status = createRes.status;
    if (status === 401 || status === 403) throw new Error("Invalid API key.");
    if (status === 429) throw new Error("Rate limited. Please wait and try again.");
    throw new Error(`Failed to create session (HTTP ${status}).`);
  }

  const session: BrowserUseSession = await createRes.json();
  if (!session.id) throw new Error("No session ID returned.");

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

    if (result.status === "timed_out") throw new Error("Browser Use timed out fetching calendar.");
    if (result.status === "error" || result.isTaskSuccessful === false) {
      throw new Error(result.lastStepSummary || "Could not fetch calendar events.");
    }

    if (
      result.output !== null &&
      result.output !== undefined &&
      !(typeof result.output === "string" && result.output.trim() === "")
    ) {
      return parseCalendarOutput(result.output);
    }

    if (result.status === "stopped") return [];
  }

  throw new Error("Calendar fetch timed out.");
}

function parseCalendarOutput(output: unknown): CalendarEvent[] {
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

  return items
    .filter((item): item is Record<string, any> => typeof item === "object" && item !== null)
    .map((item, i) => ({
      id: String(i),
      summary: item.summary || item.title || "Untitled",
      date: item.date || "",
      time: item.time || "",
      duration: item.duration || "",
      location: item.location || "",
    }));
}
