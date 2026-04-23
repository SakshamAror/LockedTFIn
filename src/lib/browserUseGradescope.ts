import { getSettings } from "@/components/SettingsPanel";
import { runBrowserTask, parseJsonArray, isRecord } from "@/lib/browserUseCore";

export interface GradescopeAssignment {
  id: number;
  title: string;
  course: string;
  instructor: string;
  dueDate: string;
  lateDueDate: string | null;
  points: string;
  submitted: boolean;
  graded: boolean;
  url: string;
  source: "gradescope";
}

export async function fetchGradescopeAssignments(
  signal?: AbortSignal,
  days: number = 14,
): Promise<GradescopeAssignment[]> {
  const { apiKey, canvasUsername, canvasPassword } = getSettings();

  if (!apiKey) throw new Error("Please configure your Browser Use API key in Settings first.");
  if (!canvasUsername || !canvasPassword) throw new Error("Please enter your UCSD SSO credentials in Settings first.");

  const task = `
Login to Gradescope via SSO:
1. Go to https://www.gradescope.com/saml, select "UC San Diego", complete UCSD SSO login with username "${canvasUsername}" / password "${canvasPassword}". If a "Student SSO" dropdown exists, select it first.
2. On Duo 2FA page: a push is auto-sent — poll URL every 2s up to 3min until redirected to gradescope.com. Click "No, other people use this device" if shown.
3. If login fails, return: [{"error": "Invalid UCSD credentials."}]

Scrape assignments:
4. Go to https://www.gradescope.com/, collect all course IDs from /courses/{id} links where course name contains "[SP26]" or "Spring 2026".
5. For each course, go to https://www.gradescope.com/courses/{id} and extract all assignments. Per assignment capture: title, full course name, instructor, due date (<time> with aria-label "Due..."), late due date (<time> with aria-label "Late Due...") or null, status, score, and URL.

Return ONLY a raw JSON array (no markdown, no explanation), sorted by due_date ascending, including only assignments due within ${days} days from today or with no due date:
[{"title":string,"course":string,"instructor":string,"due_date":"Mon, Apr 07 2026 at 06:59 AM UTC" or "N/A","late_due_date":string|null,"points":string|"N/A","submitted":boolean,"graded":boolean,"url":string}]
`;

  return runBrowserTask(task, apiKey, {
    signal,
    timeoutMs: 10 * 60 * 1000,
    stopOnComplete: true,
    timeoutMsg: "Gradescope fetch timed out after 10 minutes.",
    emptyResult: [],
    parseOutput,
  });
}

function parseOutput(output: unknown): GradescopeAssignment[] {
  const items = parseJsonArray(output);

  if (items.length === 1 && isRecord(items[0]) && items[0].error) {
    throw new Error(String(items[0].error));
  }

  return items
    .filter((item): item is Record<string, unknown> => isRecord(item) && !!item.title)
    .map((item, i) => ({
      id: i,
      title: String(item.title ?? "Untitled"),
      course: String(item.course ?? "Unknown Course"),
      instructor: String(item.instructor ?? "N/A"),
      dueDate: String(item.due_date ?? item.dueDate ?? "N/A"),
      lateDueDate: item.late_due_date ? String(item.late_due_date) : null,
      points: String(item.points ?? "N/A"),
      submitted: !!item.submitted,
      graded: !!item.graded,
      url: String(item.url ?? "#"),
      source: "gradescope" as const,
    }));
}
