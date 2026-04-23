import type { Email } from "@/components/EmailCard";
import { getSettings } from "@/components/SettingsPanel";
import { runBrowserTask, isRecord } from "@/lib/browserUseCore";

interface GmailMessage {
  sender: string;
  subject: string;
  preview?: { body?: string; subject?: string };
  messageText?: string;
  messageTimestamp?: string;
  labelIds?: string[];
}

export async function fetchEmails(signal?: AbortSignal, timeRange: "today" | "week" | "month" = "today", count: 5 | 10 | 30 = 5): Promise<Email[]> {
  const { apiKey, email } = getSettings();

  if (!apiKey || !email) {
    throw new Error("Please configure your API key and email in Settings first.");
  }

  const task = `Using composio connections, read only my emails from today and yesterday. Then, get my 5 most important unread emails (at ${email}) (if any) from today and yesterday and rank them by potential importance. Return ONLY a valid JSON array with objects having these fields: sender (string), subject (string), preview (first 1-2 sentences of the email body), time (string like "9:30 AM"), importance ("critical" | "high" | "medium"), category (string like "Security", "Work", "Finance", "Social", "Updates"). No markdown, no explanation, just the JSON array.`;

  return runBrowserTask(task, apiKey, {
    signal,
    timedOutMsg: "Browser Use timed out. Please check that your Gmail address and Browser Use API key are correct in Settings.",
    timeoutMsg: "Request timed out after 8 minutes. Please check that your Gmail address and Browser Use API key are correct in Settings.",
    emptyResult: [],
    parseOutput: parseSessionOutput,
  });
}

function parseSessionOutput(output: unknown): Email[] {
  let emails: Email[];

  try {
    if (typeof output === "string") {
      emails = parseJsonOutput(output);
    } else {
      emails = parseStructuredOutput(output);
    }
  } catch (err: any) {
    throw new Error(
      err.message || "Could not parse the email data. The response format was unexpected — please try again.",
    );
  }

  if (emails.length === 0) {
    console.warn("Browser Use returned output but no emails could be parsed:", output);
    throw new Error("Could not parse emails from the response. The format was unexpected — please try again.");
  }

  return emails;
}

function parseStructuredOutput(output: unknown): Email[] {
  if (Array.isArray(output)) {
    return parseAgentEmailArray(output);
  }

  if (!isRecord(output)) {
    return [];
  }

  const directMessages = output.messages;
  if (Array.isArray(directMessages)) {
    return parseMessages(directMessages as GmailMessage[]);
  }

  const nestedMessages = output.data?.response?.data?.messages;
  if (Array.isArray(nestedMessages)) {
    return parseMessages(nestedMessages as GmailMessage[]);
  }

  const nestedData = output.data;
  if (Array.isArray(nestedData)) {
    return parseAgentEmailArray(nestedData);
  }

  return [];
}

function parseAgentEmailArray(items: unknown[]): Email[] {
  return items.flatMap((item, index) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        id: index + 1,
        sender: toStringValue(item.sender, "Unknown"),
        subject: toStringValue(item.subject, "No subject"),
        preview: toStringValue(item.preview),
        time: toStringValue(item.time),
        date: toStringValue((item as any).date, ""),
        importance: normalizeImportance(item.importance),
        unread: true,
        category: toStringValue(item.category, "General"),
      },
    ];
  });
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

    const date = msg.messageTimestamp
      ? new Date(msg.messageTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";

    return {
      id: index + 1,
      sender: msg.sender || "Unknown",
      subject: msg.preview?.subject || msg.subject || "No subject",
      preview: previewText,
      time,
      date,
      importance,
      unread: msg.labelIds?.includes("UNREAD") ?? true,
      category: inferCategory(msg.labelIds || [], msg.subject || ""),
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
  const trimmedOutput = output.trim();

  try {
    return parseStructuredOutput(JSON.parse(trimmedOutput));
  } catch {
    try {
      const jsonMatch = trimmedOutput.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error(
          "No email data found in the response. Browser Use may not have been able to access your inbox.",
        );
      }
      return parseStructuredOutput(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      if (error.message.includes("No email data")) throw error;
      console.error("Failed to parse Browser Use output:", error);
      throw new Error(
        "Failed to parse email data from Browser Use. The response format was unexpected — please try again.",
      );
    }
  }
}

function normalizeImportance(value: unknown): Email["importance"] {
  return value === "critical" || value === "high" || value === "medium" ? value : "medium";
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
