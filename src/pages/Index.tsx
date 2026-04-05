import { useState, useRef, useCallback } from "react";
import { Mail, Inbox, RefreshCw, Loader2, Settings, XCircle, AlertTriangle, Calendar, Hash, GraduationCap, Clock } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import { EmailSkeleton } from "@/components/EmailSkeleton";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { SidebarAnalytics } from "@/components/SidebarAnalytics";
import { ChatBubble } from "@/components/ChatBubble";
import { CalendarEvents, type EventRange } from "@/components/CalendarEvents";
import { TimelineChart } from "@/components/TimelineChart";
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
  const [eventRange, setEventRange] = useState<EventRange>(7);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
      const fetched = await fetchCalendarEvents(eventsAbortRef.current.signal, eventRange);
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
  }, [eventRange]);

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
      const fetched = await fetchCanvasAssignments(assignmentsAbortRef.current.signal, assignmentRange);
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
  }, [isCanvasConnected, assignmentRange]);

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
      <aside className="w-56 shrink-0 sticky top-0 h-screen glass-subtle flex flex-col p-4 border-r border-border/50 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight font-display">LockedTFIn</span>
        </div>

        {/* Update All button */}
        <Button
          size="sm"
          onClick={handleUpdateAll}
          disabled={isAnyLoading}
          className="gap-1.5 mb-4 w-full font-mono"
        >
          {isAnyLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {isAnyLoading ? "Updating…" : "Update All"}
        </Button>

        <div className="flex-1">
          <ImportanceFunnel emails={emails} />
          <SidebarAnalytics events={events} assignments={assignments} lastUpdated={lastUpdated} />
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-4 border-t border-border/50 pt-4"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="glass-subtle rounded-none border-x-0 border-t-0 flex items-center justify-between px-8 py-4 shrink-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-foreground font-display">{greeting}, {userName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{today}</span>
              {lastUpdated && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status pills */}
            <div className="flex items-center gap-1.5">
              {emailHasFetched && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <Mail className="h-3 w-3" />
                  {emails.length} email{emails.length !== 1 ? "s" : ""}
                </span>
              )}
              {eventsHasFetched && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Calendar className="h-3 w-3" />
                  {events.length} event{events.length !== 1 ? "s" : ""}
                </span>
              )}
              {assignmentsHasFetched && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <GraduationCap className="h-3 w-3" />
                  {assignments.length} due
                </span>
              )}
            </div>

            {isAnyLoading && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <Button variant="outline" size="sm" onClick={handleCancelAll} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {!isConnected ? (
            <div className="glass rounded-xl p-10 text-center max-w-lg mx-auto mt-12">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground font-display mb-2">Connect your email</h2>
              <p className="text-sm text-muted-foreground mb-1">
                To pull your important emails, you need to connect via{" "}
                <a href="https://cloud.browser-use.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Browser Use Cloud
                </a>.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Enter your Gmail address and API key in Settings to get started.
              </p>
              <Button onClick={() => setSettingsOpen(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Open Settings
              </Button>
            </div>
          ) : (
            <>
              {(eventsHasFetched || assignmentsHasFetched) && (
                <TimelineChart events={events} assignments={assignments} />
              )}

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
                eventRange={eventRange}
                onRangeChange={setEventRange}
                onFetch={handleFetchEvents}
                onCancel={() => { eventsAbortRef.current?.abort(); setEventsLoading(false); }}
              />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground font-display">Priority Inbox</h2>
                <span className="text-xs text-muted-foreground">
                  {emails.length > 0 ? "Click an email to expand" : "Ranked by importance"}
                </span>
              </div>

              {/* Filters & Refetch */}
              <div className="glass rounded-lg p-4 mb-4 animate-fade-in">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Time range</span>
                    <div className="flex gap-1">
                      {(["today", "week", "month"] as TimeRange[]).map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            timeRange === range
                              ? "bg-primary/20 text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.4)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {range === "today" ? "Today" : range === "week" ? "This Week" : "This Month"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-4 w-px bg-border/50" />
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Show</span>
                    <div className="flex gap-1">
                      {([5, 10, 30] as EmailCount[]).map((count) => (
                        <button
                          key={count}
                          onClick={() => setEmailCount(count)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            emailCount === count
                              ? "bg-primary/20 text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.4)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-4 w-px bg-border/50" />
                  <Button size="sm" variant="outline" onClick={handleGetEmails} disabled={emailLoading} className="gap-1.5 ml-auto">
                    <RefreshCw className={cn("h-3 w-3", emailLoading && "animate-spin")} />
                    {emailLoading ? "Fetching…" : "Refetch"}
                  </Button>
                </div>
              </div>

              {emailError && !emailLoading && (
                <div className="glass rounded-lg p-5 mb-4 border border-destructive/20 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-1">Something went wrong</p>
                      <p className="text-xs text-muted-foreground mb-3">{emailError}</p>
                      <Button size="sm" variant="outline" onClick={handleGetEmails} className="gap-1.5">
                        <RefreshCw className="h-3 w-3" />
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {emailLoading && <EmailSkeleton count={5} />}

              {!emailLoading && emails.length === 0 && !emailError && (
                <div className="glass rounded-lg p-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {emailHasFetched
                      ? "No important emails today — you're all caught up!"
                      : 'Click "Update All" or "Refetch" to fetch your important emails.'}
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
