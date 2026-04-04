import { Mail, Inbox } from "lucide-react";
import { EmailCard } from "@/components/EmailCard";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { mockEmails } from "@/data/mockEmails";

export default function Index() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 h-screen glass-subtle flex flex-col p-4 border-r border-border/50">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">MailPulse</span>
        </div>
        <div className="flex-1">
          <ImportanceFunnel emails={mockEmails} />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground font-display">Good morning, Saksham</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {today} · {mockEmails.length} important email{mockEmails.length !== 1 ? "s" : ""} today
            </p>
          </div>
        </header>

        <div className="p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground font-display">Priority Inbox</h2>
            <span className="text-xs text-muted-foreground">Ranked by importance</span>
          </div>
          {mockEmails.length === 0 ? (
            <div className="glass rounded-lg p-12 text-center">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No important emails today — you're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mockEmails.map((email, i) => (
                <EmailCard key={email.id} email={email} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
