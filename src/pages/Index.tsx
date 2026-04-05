import { useState, useRef, useCallback } from "react";
import { Mail, Inbox, RefreshCw, Loader2, Settings, XCircle, AlertTriangle } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import { EmailSkeleton } from "@/components/EmailSkeleton";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { CalendarEvents } from "@/components/CalendarEvents";
import { SettingsPanel, getSettings } from "@/components/SettingsPanel";
import { fetchEmails } from "@/lib/browserUse";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Email } from "@/components/EmailCard";

export default function Index() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { apiKey, email } = getSettings();
  const isConnected = !!(apiKey && email);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const userName = email?.split("@")[0] || "there";

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    toast.info("Fetch cancelled.");
  }, []);

  const handleGetEmails = async () => {
    if (!isConnected) {
      toast.error("Please set your API key and email in Settings first.");
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    toast.info("Fetching your emails… this may take a few minutes.");

    try {
      const fetched = await fetchEmails(abortRef.current.signal);
      if (fetched.length > 0) {
        setEmails(fetched);
        toast.success(`Found ${fetched.length} important email${fetched.length !== 1 ? "s" : ""}!`);
      } else {
        setEmails([]);
        toast.info("No important emails found today.");
      }
      setError(null);
      setHasFetched(true);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      const msg = err.message || "Failed to fetch emails.";
      setError(msg);
      toast.error(msg);
      setEmails([]);
      setHasFetched(true);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const filterByImportance = (importance: string) => {
    return emails.filter((e) => e.importance === importance);
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 h-screen glass-subtle flex flex-col p-4 border-r border-border/50">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight font-display">MailPulse</span>
        </div>
        <div className="flex-1">
          <ImportanceFunnel emails={emails} />
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-4 border-t border-border/50 pt-4"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground font-display">Good morning, {userName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {today} · {emails.length} important email{emails.length !== 1 ? "s" : ""} today
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
            <Button onClick={handleGetEmails} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? "Fetching…" : "Get Emails"}
            </Button>
          </div>
        </header>

        <div className="p-8">
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
              <CalendarEvents />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground font-display">Priority Inbox</h2>
                <span className="text-xs text-muted-foreground">
                  {emails.length > 0 ? "Click an email to expand" : "Ranked by importance"}
                </span>
              </div>

              {/* Error state with retry */}
              {error && !loading && (
                <div className="glass rounded-lg p-5 mb-4 border border-destructive/20 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-1">Something went wrong</p>
                      <p className="text-xs text-muted-foreground mb-3">{error}</p>
                      <Button size="sm" variant="outline" onClick={handleGetEmails} className="gap-1.5">
                        <RefreshCw className="h-3 w-3" />
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading skeletons */}
              {loading && <EmailSkeleton count={5} />}

              {/* Empty state — only show if no error */}
              {!loading && emails.length === 0 && !error && (
                <div className="glass rounded-lg p-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {hasFetched
                      ? "No important emails today — you're all caught up!"
                      : 'Click "Get Emails" to fetch your important emails.'}
                  </p>
                  {!hasFetched && (
                    <Button onClick={handleGetEmails} disabled={loading} className="gap-2 mt-4">
                      <RefreshCw className="h-4 w-4" />
                      Get Emails
                    </Button>
                  )}
                </div>
              )}

              {/* Email list */}
              {!loading && emails.length > 0 && (
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
    </div>
  );
}
