import type { Email } from "@/components/EmailCard";
import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";

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

  const session = await createRes.json();
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

    const result = await pollRes.json();
    console.log("Poll result:", JSON.stringify(result).slice(0, 300));

    // Handle direct success response (no status field)
    if (result.success && result.data?.response?.successful) {
      const messages = result.data.response.data?.messages || [];
      return parseMessages(messages);
    }

    // Handle status-based responses
    const status = result.status || result.data?.status;

    if (status === "finished" || status === "completed" || status === "done") {
      // Try to extract from output string
      if (result.output) {
        return parseJsonOutput(result.output);
      }
      // Try nested data
      const messages = result.data?.response?.data?.messages || [];
      return parseMessages(messages);
    }

    if (status === "failed" || status === "error") {
      throw new Error("Browser Use task failed. Please verify your API key and Gmail address in Settings.");
    }

    // If success is explicitly false, it failed
    if (result.success === false) {
      throw new Error("Browser Use task failed: " + (result.error || result.message || "Unknown error"));
    }
  }

  throw new Error("Request timed out. Please check that your Gmail address and Browser Use API key are correct in Settings.");
}

interface GmailMessage {
  sender: string;
  subject: string;
  preview?: { body?: string; subject?: string };
  messageText?: string;
  messageTimestamp?: string;
  labelIds?: string[];
  to?: string;
}

function parseMessages(messages: GmailMessage[]): Email[] {
  return messages.map((msg, index) => {
    const previewText = msg.preview?.body || msg.messageText?.slice(0, 150) || "";
    const isImportant = msg.labelIds?.includes("IMPORTANT");

    let importance: Email["importance"] = "medium";
    if (msg.labelIds?.includes("CATEGORY_PERSONAL") || isImportant) {
      importance = "high";
    }
    if (msg.subject?.toLowerCase().includes("security") || msg.subject?.toLowerCase().includes("alert")) {
      importance = "critical";
    }

    const time = msg.messageTimestamp
      ? new Date(msg.messageTimestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "";

    const category = inferCategory(msg.labelIds || [], msg.subject || "");

    return {
      id: index + 1,
      sender: msg.sender || "Unknown",
      subject: msg.preview?.subject || msg.subject || "No subject",
      preview: previewText,
      time,
      importance,
      unread: msg.labelIds?.includes("UNREAD") ?? true,
      category,
    };
  });
}

function inferCategory(labelIds: string[], subject: string): string {
  if (labelIds.includes("CATEGORY_SOCIAL")) return "Social";
  if (labelIds.includes("CATEGORY_PROMOTIONS")) return "Promotions";
  if (labelIds.includes("CATEGORY_UPDATES")) return "Updates";
  if (labelIds.includes("CATEGORY_FORUMS")) return "Forums";
  if (labelIds.includes("CATEGORY_PERSONAL")) return "Personal";
  if (subject.toLowerCase().includes("security")) return "Security";
  if (subject.toLowerCase().includes("invoice") || subject.toLowerCase().includes("payment")) return "Finance";
  return "General";
}

function parseJsonOutput(output: string): Email[] {
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
