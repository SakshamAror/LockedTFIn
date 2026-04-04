import { LayoutDashboard, MessageSquare, FileText, Clock, Share2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const topIcons = [
  { icon: LayoutDashboard, active: true },
  { icon: MessageSquare },
  { icon: FileText },
  { icon: Clock },
  { icon: Share2 },
  { icon: MessageCircle },
];

export function IconSidebar() {
  return (
    <aside className="w-16 shrink-0 h-screen glass-subtle flex flex-col items-center py-6 border-r border-border/50 gap-1">
      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center mb-8">
        <LayoutDashboard className="h-5 w-5 text-primary" />
      </div>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {topIcons.map((item, i) => (
          <button
            key={i}
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
              item.active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </nav>
    </aside>
  );
}
