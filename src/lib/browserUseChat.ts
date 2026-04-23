import { getSettings } from "@/components/SettingsPanel";
import { runBrowserTask, stopBrowserSession, BASE_URL } from "@/lib/browserUseCore";

let activeSessionId: string | null = null;

export async function runChatTask(userMessage: string, signal?: AbortSignal): Promise<string> {
  const { apiKey } = getSettings();

  if (!apiKey) {
    throw new Error("Please configure your API key in Settings first.");
  }

  const task = `Using composio connections, ${userMessage}. Print out the information in a clean, readable way utilizing text art properly. If you encounter errors or limitations executing the command, just respond with "I can't help you with this functionality yet". Also respond with that if further integrations or connections are required that are not Gmail or Google calendar`;

  return runBrowserTask(task, apiKey, {
    signal,
    timedOutMsg: "Task timed out.",
    timeoutMsg: "Task timed out after 8 minutes.",
    emptyResult: "Task completed with no output.",
    onSessionId: (id) => { activeSessionId = id; },
    parseOutput: (output) => {
      activeSessionId = null;
      return typeof output === "string" ? output : JSON.stringify(output, null, 2);
    },
  });
}

export async function stopSession(): Promise<void> {
  if (!activeSessionId) return;
  const { apiKey } = getSettings();
  if (!apiKey) return;
  await stopBrowserSession(activeSessionId, apiKey);
  activeSessionId = null;
}
