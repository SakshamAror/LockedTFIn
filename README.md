# 🔒 Locked In

> A unified student command center for UCSD — Canvas, WebReg, Gmail, and Google Calendar in one screen.

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white">
  <img alt="Browser Use" src="https://img.shields.io/badge/Browser_Use-v3-000000">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

## 📖 Overview

**Locked In** pulls everything a UCSD student juggles — **Gmail**, **Google Calendar**, **Canvas assignments**, and **WebReg class schedule** — into a single dashboard, then lets you push your class schedule straight into Google Calendar with one click.

Built on top of the [Browser Use](https://browser-use.com) cloud agent, so it works on real authenticated sessions (UCSD SSO + Duo, Gmail, Calendar) **without** needing fragile official APIs or per-student OAuth setup.

## 🧱 Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (semantic HSL tokens) |
| Charts | Recharts |
| Automation | Browser Use Cloud API v3 |
| Persistence | `localStorage` (no backend) |

---

## ✨ Features

### 1. Canvas Assignments
> `src/lib/browserUseCanvas.ts`

Logs into `canvas.ucsd.edu` via UCSD SSO, waits for Duo approval on your phone, clicks **"No, other people use this device"**, then hits the Canvas planner + courses APIs from inside the live browser session. Returns a clean, sorted list of upcoming assignments / quizzes / discussions for the next **1, 7, or 14 days**.

**Why:** Canvas's UI buries due dates across courses. Students get one chronological feed of what's actually due.

### 2. WebReg Schedule
> `src/lib/browserUseWebReg.ts` · `src/components/WebRegSchedule.tsx`

Same SSO + Duo dance against `act.ucsd.edu/webreg2`. Selects the term (default `SP26`), then calls the internal `get-class` endpoint to pull enrolled lectures, discussions, labs, and finals. Renders them as a weekly grid color-coded by course.

**Why:** WebReg is famously slow and ugly. This gives you a Google-Calendar-style view of your week in seconds.

### 3. Push Schedule → Google Calendar
> `src/lib/browserUsePushToCalendar.ts`

Takes your parsed WebReg schedule and instructs an agent to create:
- One **weekly recurring** event per meeting (LE / DI / LA / SE), stopping the day before finals
- One **one-time** event per FI / MI exam on its actual date
- A consistent color per course

**Why:** Manually entering 4–6 classes × multiple meeting types takes 20+ minutes per quarter. This is one click.

### 4. Calendar Events
> `src/lib/browserUseCalendar.ts`

Pulls all upcoming Google Calendar events for the connected account over the next **1, 7, or 14 days**.

### 5. Gmail Triage
> `src/lib/browserUseChat.ts` · `src/components/EmailCard.tsx` · `src/components/ImportanceFunnel.tsx`

Reads the inbox and surfaces an importance-ranked, summarized view of recent emails — clearing the noise (newsletters, promo) from the signal (professors, financial aid, deadlines).

### 6. Unified Workload Timeline
> `src/components/TimelineChart.tsx`

Once both assignments and events are fetched, renders a single dot-plot over the next *N* days. Assignments and events are color-coded so you can instantly see crunch days.

### 7. Gradescope
> `src/lib/browserUseGradescope.ts`

Pulls outstanding Gradescope assignments using the same agent pattern.

---

## ⚙️ How the Browser Use integration works

Every data source in `src/lib/browserUse*.ts` follows the same pattern:

```text
1. POST /api/v3/sessions
   └─ task = step-numbered prompt:
      login → 2FA wait → click "No, other people use this device"
      → fetch() from the live tab → return raw JSON

2. Poll GET /api/v3/sessions/:id every 5s (max 8–10 min)
   └─ respects AbortSignal so the user can cancel

3. parseOutput()
   └─ strips markdown fences, extracts the JSON array,
      normalizes into typed shapes (CanvasAssignment, WebRegCourse, …)

4. PUT /api/v3/sessions/:id/stop
   └─ release the cloud session as soon as data is in
```

Credentials (Browser Use API key, Gmail address, UCSD SSO username/password) are entered once in the Setup panel and stored in `localStorage` — see `src/components/SettingsPanel.tsx`.

---

## 🎨 Design System

All colors are **HSL semantic tokens** defined in `src/index.css` and mapped in `tailwind.config.ts`. Components never hardcode colors — they use `bg-primary`, `text-muted-foreground`, etc. so light/dark themes stay consistent.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and `npm` / `bun`
- A [Browser Use](https://cloud.browser-use.com/settings) API key
- UCSD SSO credentials + a phone with Duo Mobile

### Install & run

```bash
# 1. Clone
git clone https://github.com/<you>/locked-in.git
cd locked-in

# 2. Install
npm install

# 3. Dev server
npm run dev
```

### Configure

1. Open the app and click the **⚙️ Setup** gear.
2. Enter:
   - Gmail address (linked to your Browser Use Composio Google connection)
   - Browser Use API key
   - UCSD SSO username + password
3. Click any **Fetch** button. **Approve Duo on your phone** when it pings.

---

## 📂 Project Structure

```
src/
├── components/        # UI components (shadcn + custom)
│   ├── CanvasAssignments.tsx
│   ├── WebRegSchedule.tsx
│   ├── CalendarEvents.tsx
│   ├── TimelineChart.tsx
│   └── SettingsPanel.tsx
├── lib/               # Browser Use integrations
│   ├── browserUseCanvas.ts
│   ├── browserUseWebReg.ts
│   ├── browserUseCalendar.ts
│   ├── browserUsePushToCalendar.ts
│   ├── browserUseChat.ts
│   └── browserUseGradescope.ts
├── pages/
│   └── Index.tsx      # Main dashboard
└── index.css          # HSL design tokens
```

---

## 💡 Why this matters

Students currently jump between **5+ tabs** (Canvas, WebReg, Gmail, Calendar, Gradescope) and re-enter their schedule into Google Calendar by hand every quarter.

Locked In collapses all of that into **one view, one login, one click** — the difference between staying organized and falling behind.

---

## 📜 License

MIT — do whatever, just don't blame us if Duo locks you out.
