import { Inbox, LayoutDashboard, Star, Archive, Settings, Clock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Inbox, label: "Inbox", badge: "10" },
  { icon: Star, label: "Important" },
  { icon: Clock, label: "Recent" },
  { icon: Filter, label: "Filtered" },
  { icon: Archive, label: "Archive" },
];

const bottomItems = [
  { icon: Settings, label: "Settings" },
];

export function DashboardSidebar() {
  return (
    <aside className="w-56 shrink-0 h-screen glass-subtle flex flex-col p-4 border-r border-border/50">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Inbox className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">LockeTFIn</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              item.active
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="space-y-1 pt-4 border-t border-border/50">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
