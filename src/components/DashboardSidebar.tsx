import { Inbox, LayoutDashboard, Clock, Archive, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Inbox, label: "Inbox" },
  { icon: Clock, label: "Recent" },
  { icon: Archive, label: "Archive" },
];

export function DashboardSidebar() {
  return (
    <aside className="w-16 shrink-0 h-screen bg-card flex flex-col items-center py-6 gap-2 border-r border-border">
      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mb-6">
        <Inbox className="h-5 w-5 text-primary-foreground" />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            title={item.label}
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
              item.active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </nav>

      <button
        title="Settings"
        className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Settings className="h-5 w-5" />
      </button>
    </aside>
  );
}
