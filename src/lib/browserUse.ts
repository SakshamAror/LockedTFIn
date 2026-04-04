import type { Email } from "@/components/EmailCard";
import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";

interface SessionResponse {
  id: string;
  status: string;
  output?: string;
}

export async function fetchEmails(): Promise<Email[]> {
  const { apiKey, email } = getSettings();

  if (!apiKey || !email) {
    throw new Error("Please configure your API key and email in Settings first.");
  }

  const createRes = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: `Pull out my 10 most important unread emails (at ${email}) (if any) from today and rank them by potential importance. Return ONLY a valid JSON array with objects having these fields: sender (string), subject (string), preview (first 1-2 sentences of the email body), time (string like "9:30 AM"), importance ("critical" | "high" | "medium"), category (string like "Security", "Work", "Finance", "Social", "Updates"). No markdown, no explanation, just the JSON array.`,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create session: ${createRes.status}`);
  }

  const session: SessionResponse = await createRes.json();
  const sessionId = session.id;

  const TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes
  const POLL_INTERVAL = 5000;
  const start = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const pollRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
      headers: { "X-Browser-Use-API-Key": apiKey },
    });

    if (!pollRes.ok) {
      throw new Error(`Failed to poll session: ${pollRes.status}`);
    }

    const result: SessionResponse = await pollRes.json();

    if (result.status === "finished" || result.status === "completed" || result.status === "done") {
      return parseEmailOutput(result.output || "");
    }

    if (result.status === "failed" || result.status === "error") {
      throw new Error("Browser Use task failed. Please verify your API key and Gmail address in Settings.");
    }
  }

  throw new Error("Request timed out. Please check that your Gmail address and Browser Use API key are correct in Settings.");
}

function parseEmailOutput(output: string): Email[] {
  try {
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((item: Record<string, string>, index: number) => ({
      id: index + 1,
      sender: item.sender || "Unknown",
      subject: item.subject || "No subject",
      preview: item.preview || "",
      time: item.time || "",
      importance: (["critical", "high", "medium"].includes(item.importance)
        ? item.importance
        : "medium") as Email["importance"],
      unread: true,
      category: item.category || "General",
    }));
  } catch (e) {
    console.error("Failed to parse email output:", e, output);
    return [];
  }
}
