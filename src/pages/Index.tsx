import { Mail, ShieldAlert, Inbox, Clock } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { EmailCard } from "@/components/EmailCard";
import { StatsCard } from "@/components/StatsCard";
import { mockEmails } from "@/data/mockEmails";

const criticalCount = mockEmails.filter(e => e.importance === "critical").length;
const categories = [...new Set(mockEmails.map(e => e.category))];

const stats = [
  { title: "Total emails", value: String(mockEmails.length), icon: Mail },
  { title: "Critical", value: String(criticalCount), subtitle: "needs attention", icon: ShieldAlert },
  { title: "Categories", value: String(categories.length), subtitle: categories.join(", "), icon: Inbox },
  { title: "Last received", value: mockEmails[0]?.time ?? "—", icon: Clock },
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

      <main className="flex-1 overflow-auto px-10 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Good morning, <span className="font-bold">Saksham</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today} · {mockEmails.length} important email{mockEmails.length !== 1 ? "s" : ""}</p>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Priority Inbox</h2>
          {mockEmails.length === 0 ? (
            <div className="card-surface p-12 text-center">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No important emails today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockEmails.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
