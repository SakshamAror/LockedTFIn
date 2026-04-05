import { getSettings } from "@/components/SettingsPanel";

const BASE_URL = "https://api.browser-use.com/api/v3";
const TIMEOUT_MS = 8 * 60 * 1000;
const POLL_INTERVAL = 5000;

interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

export async function runChatTask(
  userMessage: string,
  signal?: AbortSignal
): Promise<string> {
  const { apiKey } = getSettings();

  if (!apiKey) {
    throw new Error("Please configure your API key in Settings first.");
  }

  const task = `Using composio connections, ${userMessage}`;

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

    if (result.status === "timed_out") throw new Error("Task timed out.");
    if (result.status === "error" || result.isTaskSuccessful === false) {
      throw new Error(result.lastStepSummary || "Task failed.");
    }

    if (result.output !== null && result.output !== undefined) {
      const out = result.output;
      return typeof out === "string" ? out : JSON.stringify(out, null, 2);
    }

    if (result.status === "stopped") return "Task completed with no output.";
  }

  throw new Error("Task timed out after 8 minutes.");
}
