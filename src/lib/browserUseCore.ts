export const BASE_URL = "https://api.browser-use.com/api/v3";
export const POLL_INTERVAL = 5000;

export interface BrowserUseSession {
  id: string;
  status?: string;
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function hasOutput(output: unknown): boolean {
  return output !== null && output !== undefined && !(typeof output === "string" && output.trim() === "");
}

export async function stopBrowserSession(sessionId: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/sessions/${sessionId}/stop`, {
      method: "PUT",
      headers: { "X-Browser-Use-API-Key": apiKey },
    });
  } catch { /* best-effort */ }
}

export interface BrowserTaskOptions<T> {
  signal?: AbortSignal;
  timeoutMs?: number;
  parseOutput: (output: unknown) => T;
  stopOnComplete?: boolean;
  timeoutMsg?: string;
  timedOutMsg?: string;
  emptyResult: T;
  onSessionId?: (id: string) => void;
}

export async function runBrowserTask<T>(
  task: string,
  apiKey: string,
  options: BrowserTaskOptions<T>,
): Promise<T> {
  const {
    signal,
    timeoutMs = 8 * 60 * 1000,
    parseOutput,
    stopOnComplete = false,
    timeoutMsg = "Request timed out.",
    timedOutMsg = "Timed out. Did you approve Duo on your phone?",
    emptyResult,
    onSessionId,
  } = options;

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

  onSessionId?.(session.id);

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    signal?.throwIfAborted();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const pollRes = await fetch(`${BASE_URL}/sessions/${session.id}`, {
      headers: { "X-Browser-Use-API-Key": apiKey },
      signal,
    });

    if (!pollRes.ok) throw new Error(`Poll failed (HTTP ${pollRes.status}).`);
    const result: BrowserUseSession = await pollRes.json();

    if (result.status === "timed_out") throw new Error(timedOutMsg);
    if (result.status === "error" || result.isTaskSuccessful === false) {
      throw new Error(result.lastStepSummary || "Task failed.");
    }

    if (hasOutput(result.output)) {
      if (stopOnComplete) await stopBrowserSession(session.id, apiKey);
      return parseOutput(result.output);
    }

    if (result.status === "stopped") return emptyResult;
  }

  throw new Error(timeoutMsg);
}

export function parseJsonArray(output: unknown): unknown[] {
  if (Array.isArray(output)) return output;
  if (typeof output !== "string") return [];
  const trimmed = output.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]);
  }
}
