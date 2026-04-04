import { useState } from "react";
import { Mail, Inbox, RefreshCw, Loader2 } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { mockEmails } from "@/data/mockEmails";
import { fetchEmails } from "@/lib/browserUse";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Email } from "@/components/EmailCard";

export default function Index() {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleGetEmails = async () => {
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch emails. Please try again.");
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
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground font-display">Good morning, Saksham</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {today} · {emails.length} important email{emails.length !== 1 ? "s" : ""} today
            </p>
          </div>
          <Button
            onClick={handleGetEmails}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? "Fetching…" : "Get Emails"}
          </Button>
        </header>

        <div className="p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground font-display">Priority Inbox</h2>
            <span className="text-xs text-muted-foreground">Ranked by importance</span>
          </div>
          {emails.length === 0 ? (
            <div className="glass rounded-lg p-12 text-center">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No important emails today — you're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email, i) => (
                <EmailCard key={email.id} email={email} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
