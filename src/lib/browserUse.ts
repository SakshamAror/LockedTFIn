import type { Email } from "@/components/EmailCard";

const API_KEY = "bu_bLa0EYdNgoFuRaTHpzcxsV7luda4HkEHuXtGLm2iJS4";
const BASE_URL = "https://api.browser-use.com/api/v3";

interface SessionResponse {
  id: string;
  status: string;
  output?: string;
}

export async function fetchEmails(): Promise<Email[]> {
  // 1. Create a session/task
  const createRes = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "X-Browser-Use-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: `Pull out my 10 most important unread emails (at sakshamarora1202@gmail.com) (if any) from today and rank them by potential importance. Return ONLY a valid JSON array with objects having these fields: sender (string), subject (string), preview (first 1-2 sentences of the email body), time (string like "9:30 AM"), importance ("critical" | "high" | "medium"), category (string like "Security", "Work", "Finance", "Social", "Updates"). No markdown, no explanation, just the JSON array.`,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create session: ${createRes.status}`);
  }

  const session: SessionResponse = await createRes.json();
  const sessionId = session.id;

  // 2. Poll for completion
  let result: SessionResponse;
  const maxAttempts = 120; // 10 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
      headers: { "X-Browser-Use-API-Key": API_KEY },
    });

    if (!pollRes.ok) {
      throw new Error(`Failed to poll session: ${pollRes.status}`);
    }

    result = await pollRes.json();

    if (result.status === "finished" || result.status === "completed" || result.status === "done") {
      return parseEmailOutput(result.output || "");
    }

    if (result.status === "failed" || result.status === "error") {
      throw new Error("Browser Use task failed");
    }
  }

  throw new Error("Task timed out");
}

function parseEmailOutput(output: string): Email[] {
  try {
    // Try to extract JSON array from the output
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("No JSON array found in output:", output);
      return [];
    }

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
