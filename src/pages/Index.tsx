import { Mail, Inbox, AlertTriangle, Clock, Search, Bell, ShieldAlert } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { EmailCard } from "@/components/EmailCard";
import { StatsCard } from "@/components/StatsCard";
import { mockEmails } from "@/data/mockEmails";
import { Input } from "@/components/ui/input";

const criticalCount = mockEmails.filter(e => e.importance === "critical").length;
const highCount = mockEmails.filter(e => e.importance === "high").length;
const categories = [...new Set(mockEmails.map(e => e.category))];

const stats = [
  { title: "Unread Today", value: String(mockEmails.length), icon: Mail },
  { title: "Critical", value: String(criticalCount), icon: ShieldAlert, change: "needs attention", changeType: "up" as const },
  { title: "Categories", value: categories.join(", "), icon: Inbox },
  { title: "Last Received", value: mockEmails[0]?.time ?? "—", icon: Clock },
];

export default function Index() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Good morning, Saksham</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{today} · {mockEmails.length} important email{mockEmails.length !== 1 ? "s" : ""} today</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                className="w-56 h-9 pl-9 text-xs bg-muted/50 border-border/50 focus:bg-muted"
              />
            </div>
            <button className="relative h-9 w-9 rounded-md glass flex items-center justify-center hover:bg-muted/50 transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {criticalCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />}
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatsCard key={stat.title} {...stat} index={i} />
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Priority Inbox</h2>
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
        </div>
      </main>
    </div>
  );
}
