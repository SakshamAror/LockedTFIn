import { useState } from "react";
import { Mail, Inbox, RefreshCw, Loader2, Settings } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { SettingsPanel, getSettings } from "@/components/SettingsPanel";
import { mockEmails } from "@/data/mockEmails";
import { fetchEmails } from "@/lib/browserUse";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Email } from "@/components/EmailCard";

export default function Index() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { apiKey, email } = getSettings();
  const isConnected = !!(apiKey && email);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const userName = email?.split("@")[0] || "there";

  const handleGetEmails = async () => {
    if (!isConnected) {
      toast.error("Please set your API key and email in Settings first.");
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    toast.info("Fetching your emails… this may take a few minutes.");
    try {
      const fetched = await fetchEmails();
      if (fetched.length > 0) {
        setEmails(fetched);
        toast.success(`Found ${fetched.length} important email${fetched.length !== 1 ? "s" : ""}!`);
      } else {
        toast.info("No important emails found today.");
      }
      setHasFetched(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch emails.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
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
          <Button onClick={handleGetEmails} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? "Fetching…" : "Get Emails"}
          </Button>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground font-display">Priority Inbox</h2>
                <span className="text-xs text-muted-foreground">Ranked by importance</span>
              </div>
              {emails.length === 0 ? (
                <div className="glass rounded-lg p-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {hasFetched
                      ? "No important emails today — you're all caught up!"
                      : "Click \"Get Emails\" to fetch your important emails."}
                  </p>
                  {!hasFetched && (
                    <Button onClick={handleGetEmails} disabled={loading} className="gap-2 mt-4">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {loading ? "Fetching…" : "Get Emails"}
                    </Button>
                  )}
                </div>
              ) : (
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
