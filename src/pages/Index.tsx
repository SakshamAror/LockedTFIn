import { Mail, ShieldAlert, Inbox, Clock, AlertTriangle } from "lucide-react";
import { IconSidebar } from "@/components/IconSidebar";
import { EmailCard } from "@/components/EmailCard";
import { ImportanceFunnel } from "@/components/ImportanceFunnel";
import { mockEmails } from "@/data/mockEmails";
import { cn } from "@/lib/utils";

const criticalCount = mockEmails.filter(e => e.importance === "critical").length;
const highCount = mockEmails.filter(e => e.importance === "high").length;
const mediumCount = mockEmails.filter(e => e.importance === "medium").length;
const categories = [...new Set(mockEmails.map(e => e.category))];

const stats = [
  { title: "Total Emails", value: String(mockEmails.length), icon: Mail, change: "today", changeType: "up" as const },
  { title: "Critical", value: String(criticalCount), icon: ShieldAlert, change: "needs attention", changeType: "up" as const },
  { title: "High Priority", value: String(highCount), icon: AlertTriangle },
  { title: "Categories", value: String(categories.length), icon: Inbox, change: categories.join(", "), changeType: "up" as const },
];

const tabs = ["Dashboard", "Inbox", "Categories"];

export default function Index() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex min-h-screen bg-background">
      <IconSidebar />

      <div className="flex-1 overflow-auto">
        {/* Top header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {greeting}, <span className="text-gradient">Saksham</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{today}</p>
          </div>

          <div className="flex items-center gap-1 glass rounded-full p-1">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div
                key={stat.title}
                className="glass rounded-lg p-5 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{stat.title}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                  {stat.change && (
                    <span className={cn(
                      "text-xs font-medium mb-1",
                      stat.changeType === "up" ? "text-success" : "text-muted-foreground"
                    )}>
                      {stat.change}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Priority Inbox — takes 2 cols */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Priority Inbox</h2>
                <span className="text-xs text-muted-foreground">Ranked by importance</span>
              </div>
              {mockEmails.length === 0 ? (
                <div className="glass rounded-lg p-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No important emails today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mockEmails.map((email, i) => (
                    <EmailCard key={email.id} email={email} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Right column — Funnel + summary */}
            <div className="space-y-6">
              <ImportanceFunnel emails={mockEmails} />

              <div className="glass rounded-lg p-5 animate-fade-in" style={{ animationDelay: "300ms" }}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Categories
                </h3>
                <div className="space-y-3">
                  {categories.map((cat) => {
                    const count = mockEmails.filter(e => e.category === cat).length;
                    const pct = Math.round((count / mockEmails.length) * 100);
                    return (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{cat}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
