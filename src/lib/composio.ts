const BASE_URL = "https://backend.composio.dev/api/v3/tools/execute";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
}

export function getComposioSettings() {
  return {
    composioApiKey: localStorage.getItem("composio_api_key") || "",
    composioAccountId: localStorage.getItem("composio_account_id") || "",
  };
}

export async function fetchCalendarEvents(signal?: AbortSignal): Promise<CalendarEvent[]> {
  const { composioApiKey, composioAccountId } = getComposioSettings();

  if (!composioApiKey || !composioAccountId) {
    throw new Error("Please configure your Composio API key and Connected Account ID in Settings first.");
  }

  const now = new Date().toISOString();
  const endOfWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(`${BASE_URL}/GOOGLECALENDAR_EVENTS_LIST`, {
    method: "POST",
    headers: {
      "x-api-key": composioApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connected_account_id: composioAccountId,
      arguments: {
        calendar_id: "primary",
        timeMin: now,
        timeMax: endOfWeek,
        maxResults: 5,
        singleEvents: true,
        orderBy: "startTime",
      },
    }),
    signal,
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401 || status === 403) {
      throw new Error("Invalid Composio API key. Please check Settings.");
    }
    if (status === 404) {
      throw new Error("Google Calendar not connected in Composio. Please set up the connection first.");
    }
    throw new Error(`Composio API error (HTTP ${status}). Please try again.`);
  }

  const data = await res.json();
  return parseCalendarResponse(data);
}

function parseCalendarResponse(data: unknown): CalendarEvent[] {
  if (!data || typeof data !== "object") return [];

  const responseData = (data as any)?.data?.response_data;
  const items = responseData?.items || (data as any)?.data?.items || (data as any)?.items;

  if (!Array.isArray(items)) {
    console.warn("Unexpected Composio calendar response:", data);
    return [];
  }

  return items.slice(0, 5).map((item: any, i: number) => ({
    id: item.id || String(i),
    summary: item.summary || "Untitled event",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    location: item.location || "",
    htmlLink: item.htmlLink || "",
  }));
}
