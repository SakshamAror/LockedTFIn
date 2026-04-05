import { useState, useRef, useCallback } from "react";
import { Mail, Inbox, RefreshCw, Loader2, Settings, XCircle, AlertTriangle, Calendar, Hash, Zap } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import { EmailSkeleton } from "@/components/EmailSkeleton";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { SidebarAnalytics } from "@/components/SidebarAnalytics";
import { ChatBubble } from "@/components/ChatBubble";
import { CalendarEvents } from "@/components/CalendarEvents";
import { CanvasAssignments, type AssignmentRange } from "@/components/CanvasAssignments";
import { SettingsPanel, getSettings } from "@/components/SettingsPanel";
import { fetchEmails } from "@/lib/browserUse";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/browserUseCalendar";
import { fetchCanvasAssignments, type CanvasAssignment } from "@/lib/browserUseCanvas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Email, TimeRange, EmailCount } from "@/components/EmailCard";

export default function Index() {
  // Email state
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailHasFetched, setEmailHasFetched] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [emailCount, setEmailCount] = useState<EmailCount>(5);
  const emailAbortRef = useRef<AbortController | null>(null);

  // Calendar state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsHasFetched, setEventsHasFetched] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const eventsAbortRef = useRef<AbortController | null>(null);

  // Canvas state
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsHasFetched, setAssignmentsHasFetched] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [assignmentRange, setAssignmentRange] = useState<AssignmentRange>(7);
  const assignmentsAbortRef = useRef<AbortController | null>(null);

  // Shared state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { apiKey, email, canvasUsername, canvasPassword } = getSettings();
  const isConnected = !!(apiKey && email);
  const isCanvasConnected = !!(canvasUsername && canvasPassword && apiKey);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const userName = email?.split("@")[0] || "there";

  // Email fetch
  const handleGetEmails = useCallback(async () => {
    if (!isConnected) {
      toast.error("Please set your API key and email in Settings first.");
      setSettingsOpen(true);
      return;
    }
    setEmailLoading(true);
    setEmailError(null);
    emailAbortRef.current = new AbortController();
    toast.info("Fetching your emails…");
    try {
      const fetched = await fetchEmails(emailAbortRef.current.signal, timeRange, emailCount);
      setEmails(fetched.length > 0 ? fetched : []);
      setEmailError(null);
      setEmailHasFetched(true);
      if (fetched.length > 0) toast.success(`Found ${fetched.length} email${fetched.length !== 1 ? "s" : ""}!`);
      else toast.info("No important emails found.");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "Failed to fetch emails.";
      setEmailError(msg);
      toast.error(msg);
      setEmails([]);
      setEmailHasFetched(true);
    } finally {
      setEmailLoading(false);
      emailAbortRef.current = null;
    }
  }, [isConnected, timeRange, emailCount]);

  // Calendar fetch
  const handleFetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    eventsAbortRef.current = new AbortController();
    toast.info("Fetching calendar events…");
    try {
      const fetched = await fetchCalendarEvents(eventsAbortRef.current.signal);
      setEvents(fetched);
      setEventsHasFetched(true);
      if (fetched.length > 0) toast.success(`Found ${fetched.length} event${fetched.length !== 1 ? "s" : ""}.`);
      else toast.info("No upcoming events.");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "Failed to fetch calendar.";
      setEventsError(msg);
      toast.error(msg);
      setEventsHasFetched(true);
    } finally {
      setEventsLoading(false);
      eventsAbortRef.current = null;
    }
  }, []);

  // Canvas fetch
  const handleFetchAssignments = useCallback(async () => {
    if (!isCanvasConnected) {
      toast.error("Please set your Canvas SSO credentials in Settings first.");
      setSettingsOpen(true);
      return;
    }
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    assignmentsAbortRef.current = new AbortController();
    toast.info("Fetching Canvas assignments… Approve Duo 2FA on your device.", { duration: 10000 });
    try {
      const fetched = await fetchCanvasAssignments(assignmentsAbortRef.current.signal);
      setAssignments(fetched);
      setAssignmentsHasFetched(true);
      if (fetched.length > 0) toast.success(`Found ${fetched.length} assignment${fetched.length !== 1 ? "s" : ""}.`);
      else toast.info("No assignments found.");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "Failed to fetch assignments.";
      setAssignmentsError(msg);
      toast.error(msg);
      setAssignmentsHasFetched(true);
    } finally {
      setAssignmentsLoading(false);
      assignmentsAbortRef.current = null;
    }
  }, [isCanvasConnected]);

  // Update All
  const isAnyLoading = emailLoading || eventsLoading || assignmentsLoading;

  const handleUpdateAll = useCallback(async () => {
    if (!isConnected) {
      toast.error("Please configure Settings first.");
      setSettingsOpen(true);
      return;
    }
    toast.info("Updating everything…");
    const promises: Promise<void>[] = [handleGetEmails(), handleFetchEvents()];
    if (isCanvasConnected) promises.push(handleFetchAssignments());
    await Promise.allSettled(promises);
    setLastUpdated(new Date());
    toast.success("All updated!");
  }, [handleGetEmails, handleFetchEvents, handleFetchAssignments, isConnected, isCanvasConnected]);

  const handleCancelAll = useCallback(() => {
    emailAbortRef.current?.abort();
    eventsAbortRef.current?.abort();
    assignmentsAbortRef.current?.abort();
    setEmailLoading(false);
    setEventsLoading(false);
    setAssignmentsLoading(false);
    toast.info("All fetches cancelled.");
  }, []);

  return (
    <div className="flex min-h-screen relative z-10">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 sticky top-0 h-screen glass-subtle flex flex-col p-5 border-r border-border/30 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1 mb-7">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center ring-1 ring-primary/15">
            <Inbox className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight font-display">LockedTFIn</span>
            <span className="block text-[10px] text-muted-foreground/50 tracking-wide">DASHBOARD</span>
          </div>
        </div>

        {/* Update All button */}
        <Button
          size="sm"
          onClick={handleUpdateAll}
          disabled={isAnyLoading}
          className="gap-2 mb-5 w-full h-9 rounded-xl font-semibold text-xs bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20 transition-all duration-300"
        >
          {isAnyLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {isAnyLoading ? "Updating…" : "Update All"}
        </Button>

        <div className="flex-1">
          <ImportanceFunnel emails={emails} />
          <SidebarAnalytics events={events} assignments={assignments} lastUpdated={lastUpdated} />
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-all duration-200 mt-4 border-t border-border/20 pt-5 group"
        >
          <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
          <span className="font-medium">Settings</span>
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="glass-subtle rounded-none border-x-0 border-t-0 flex items-center justify-between px-8 py-5 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground font-display tracking-tight">
              Good morning, <span className="text-gradient-accent">{userName}</span>
            </h1>
            <p className="text-[11px] text-muted-foreground/70 mt-1 mono">
              {today} · {emails.length} important email{emails.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isAnyLoading && (
            <Button variant="outline" size="sm" onClick={handleCancelAll} className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-lg">
              <XCircle className="h-3.5 w-3.5" />
              Cancel All
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-auto p-8">
          {!isConnected ? (
            <div className="glass gradient-border rounded-2xl p-12 text-center max-w-lg mx-auto mt-16">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/15">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground font-display mb-2 tracking-tight">Connect your email</h2>
              <p className="text-sm text-muted-foreground/70 mb-1 leading-relaxed">
                To pull your important emails, connect via{" "}
                <a href="https://cloud.browser-use.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 transition-colors">
                  Browser Use Cloud
                </a>.
              </p>
              <p className="text-xs text-muted-foreground/50 mb-7">
                Enter your Gmail address and API key in Settings to get started.
              </p>
              <Button onClick={() => setSettingsOpen(true)} className="gap-2 rounded-xl h-10 px-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20">
                <Settings className="h-4 w-4" />
                Open Settings
              </Button>
            </div>
          ) : (
            <>
              <CanvasAssignments
                assignments={assignments}
                loading={assignmentsLoading}
                hasFetched={assignmentsHasFetched}
                error={assignmentsError}
                isConnected={isCanvasConnected}
                assignmentRange={assignmentRange}
                onRangeChange={setAssignmentRange}
                onFetch={handleFetchAssignments}
                onCancel={() => { assignmentsAbortRef.current?.abort(); setAssignmentsLoading(false); }}
                onOpenSettings={() => setSettingsOpen(true)}
              />
              <CalendarEvents
                events={events}
                loading={eventsLoading}
                hasFetched={eventsHasFetched}
                error={eventsError}
                onFetch={handleFetchEvents}
                onCancel={() => { eventsAbortRef.current?.abort(); setEventsLoading(false); }}
              />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground font-display tracking-tight">Priority Inbox</h2>
                <span className="text-[10px] text-muted-foreground/50 mono">
                  {emails.length > 0 ? "Click to expand" : "Ranked by importance"}
                </span>
              </div>

              {/* Filters & Refetch */}
              <div className="glass rounded-xl p-4 mb-4 animate-fade-in">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">RANGE</span>
                    <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted/15 ring-1 ring-border/15">
                      {(["today", "week", "month"] as TimeRange[]).map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${
                            timeRange === range
                              ? "bg-primary/15 text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {range === "today" ? "Today" : range === "week" ? "Week" : "Month"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-4 w-px bg-border/20" />
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">SHOW</span>
                    <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted/15 ring-1 ring-border/15">
                      {([5, 10, 30] as EmailCount[]).map((count) => (
                        <button
                          key={count}
                          onClick={() => setEmailCount(count)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 mono ${
                            emailCount === count
                              ? "bg-primary/15 text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-4 w-px bg-border/20" />
                  <Button size="sm" variant="outline" onClick={handleGetEmails} disabled={emailLoading} className="gap-1.5 ml-auto rounded-lg h-7 text-xs">
                    <RefreshCw className={cn("h-3 w-3", emailLoading && "animate-spin")} />
                    {emailLoading ? "Fetching…" : "Refetch"}
                  </Button>
                </div>
              </div>

              {emailError && !emailLoading && (
                <div className="glass rounded-xl p-5 mb-4 border border-destructive/15 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 ring-1 ring-destructive/15">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground mb-1">Something went wrong</p>
                      <p className="text-xs text-muted-foreground/70 mb-3">{emailError}</p>
                      <Button size="sm" variant="outline" onClick={handleGetEmails} className="gap-1.5 rounded-lg">
                        <RefreshCw className="h-3 w-3" />
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {emailLoading && <EmailSkeleton count={5} />}

              {!emailLoading && emails.length === 0 && !emailError && (
                <div className="glass rounded-xl p-14 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground/25 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground/60">
                    {emailHasFetched
                      ? "No important emails — you're all caught up! ✨"
                      : 'Click "Update All" or "Refetch" to fetch your emails.'}
                  </p>
                </div>
              )}

              {!emailLoading && emails.length > 0 && (
                <div className="space-y-2">
                  {emails.map((email, i) => (
                    <EmailCard key={email.id} email={email} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ChatBubble />
    </div>
  );
}
