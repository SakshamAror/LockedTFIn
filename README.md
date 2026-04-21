# Locked In — A Student Command Center

A unified dashboard that pulls everything a UCSD student juggles — Gmail, Google Calendar, Canvas assignments, and WebReg class schedule — into a single screen, then lets you push your class schedule straight into Google Calendar with one click.

Built on top of the [Browser Use](https://browser-use.com) cloud agent, so it works on real authenticated sessions (UCSD SSO + Duo, Gmail, Calendar) without needing fragile official APIs or OAuth setup per student.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui (semantic HSL design tokens)
- Browser Use Cloud API v3 for all browser automation
- Recharts for the unified workload timeline
- 100% client-side — credentials live in `localStorage`, no backend

## Features

### 1. Canvas Assignments (`browserUseCanvas.ts`)
Logs into `canvas.ucsd.edu` via UCSD SSO, waits for the student to approve Duo on their phone, explicitly clicks **"No, other people use this device"**, then hits the Canvas planner + courses APIs from inside the browser session. Returns a clean, sorted list of upcoming assignments / quizzes / discussions for the next **1, 7, or 14 days**.

**Why it's useful:** Canvas's own UI buries due dates across multiple courses. Students see one chronological feed of what's actually due.

### 2. WebReg Schedule (`browserUseWebReg.ts`, `WebRegSchedule.tsx`)
Same SSO + Duo dance, but against `act.ucsd.edu/webreg2`. Selects the term (default `SP26`), then calls the internal `get-class` endpoint to pull the student's enrolled lectures, discussions, labs, and finals. Renders them as a weekly grid color-coded by course.

**Why it's useful:** WebReg is famously ugly and slow. This gives students a Google-Calendar-style view of their week in seconds.

### 3. Push Schedule → Google Calendar (`browserUsePushToCalendar.ts`)
Takes the parsed WebReg schedule and instructs a Browser Use agent to create one **weekly recurring** event per meeting (LE/DI/LA/SE) and one **one-time** event per FI/MI exam in the user's Google Calendar. Each course gets its own consistent color, recurrence stops the day before finals, and exams land on their actual date.

**Why it's useful:** Manually entering 4–6 classes × multiple meeting types into Google Calendar takes 20+ minutes per quarter. This is one click.

### 4. Calendar Events (`browserUseCalendar.ts`)
Pulls all upcoming Google Calendar events for the connected account over the next **1, 7, or 14 days**.

### 5. Gmail Triage (`browserUseChat.ts`, `EmailCard.tsx`, `ImportanceFunnel.tsx`)
Reads the inbox and surfaces an importance-ranked, summarized view of recent emails — so students can clear the noise (newsletters, promo) from the signal (professors, financial aid, deadlines).

### 6. Unified Workload Timeline (`TimelineChart.tsx`)
Once both assignments and events are fetched, renders a single dot-plot over the next N days: assignments and events are color-coded so students can instantly see crunch days.

### 7. Gradescope (`browserUseGradescope.ts`)
Pulls outstanding Gradescope assignments using the same agent pattern.

## How the Browser Use integration works

Every data source follows the same pattern in `src/lib/browserUse*.ts`:

1. `POST /api/v3/sessions` with a precise, step-numbered task prompt (login → 2FA → click "No, other people use this device" → fetch via `fetch()` from the live tab → return raw JSON).
2. Poll `GET /api/v3/sessions/:id` every 5s for up to 8–10 min, respecting an `AbortSignal` so the user can cancel.
3. `parseOutput()` strips markdown fences, extracts the JSON array, and normalizes it into a typed shape (`CanvasAssignment`, `WebRegCourse`, `CalendarEvent`, …).
4. `PUT /api/v3/sessions/:id/stop` to release the cloud session as soon as we have data.

Credentials (Browser Use API key, Gmail address, UCSD SSO username/password) are entered once in the Setup panel and stored in `localStorage` — see `SettingsPanel.tsx`.

## Design system

All colors are HSL semantic tokens defined in `src/index.css` and mapped in `tailwind.config.ts`. Components never hardcode colors — use `bg-primary`, `text-muted-foreground`, etc.

## Setup

1. Get a Browser Use API key at [cloud.browser-use.com/settings](https://cloud.browser-use.com/settings).
2. Open the app, click the Setup gear, and enter:
   - Gmail address (must be linked to your Browser Use Composio Google connection)
   - Browser Use API key
   - UCSD SSO username + password
3. Click any **Fetch** button. Approve Duo on your phone when it pings.

## Why this matters for students

Students currently jump between 5+ tabs (Canvas, WebReg, Gmail, Calendar, Gradescope) and re-enter their schedule into Google Calendar by hand every quarter. This collapses all of that into one view, one login, one click — which is the actual difference between staying organized and falling behind.
