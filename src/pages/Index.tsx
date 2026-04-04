import { Mail, Inbox, AlertTriangle, Clock, Search, Bell } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { EmailCard } from "@/components/EmailCard";
import { StatsCard } from "@/components/StatsCard";
import { mockEmails } from "@/data/mockEmails";
import { Input } from "@/components/ui/input";

const stats = [
  { title: "Unread", value: "10", change: "3 new", changeType: "up" as const, icon: Mail },
  { title: "Critical", value: "2", icon: AlertTriangle, change: "action needed", changeType: "up" as const },
  { title: "Today's Total", value: "24", icon: Inbox },
  { title: "Avg. Response", value: "12m", icon: Clock, change: "2m faster", changeType: "up" as const },
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
            <p className="text-xs text-muted-foreground mt-0.5">{today} · 10 important emails today</p>
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
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />
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
            <div className="space-y-2">
              {mockEmails.map((email, i) => (
                <EmailCard key={email.id} email={email} index={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
