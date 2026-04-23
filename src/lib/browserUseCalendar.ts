import { getSettings } from "@/components/SettingsPanel";
import { runBrowserTask, parseJsonArray } from "@/lib/browserUseCore";

export interface CalendarEvent {
  id: string;
  summary: string;
  date: string;
  time: string;
  duration?: string;
  location?: string;
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

  const task = `Go to Google Calendar for the account ${email} from composio connections and get ALL events from ${todayStr} through ${endStr} (the next ${days} day${days !== 1 ? "s" : ""}). Return ONLY a valid JSON array with objects having these fields: summary (string - event title), date (string like "Mon, Apr 7"), time (string like "9:00 AM - 10:00 AM"), duration (string like "1 hour"), location (string, empty if none). No markdown, no explanation, just the JSON array.`;

  return runBrowserTask(task, apiKey, {
    signal,
    timedOutMsg: "Browser Use timed out fetching calendar.",
    timeoutMsg: "Calendar fetch timed out.",
    emptyResult: [],
    parseOutput: parseCalendarOutput,
  });
}

function parseCalendarOutput(output: unknown): CalendarEvent[] {
  return parseJsonArray(output)
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
