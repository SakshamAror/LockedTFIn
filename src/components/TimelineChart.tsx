import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { CalendarEvent } from "@/lib/browserUseCalendar";
import type { CanvasAssignment } from "@/lib/browserUseCanvas";

interface TimelineChartProps {
  events: CalendarEvent[];
  assignments: CanvasAssignment[];
}

function parseDate(dateStr: string): Date | null {
  // Try common formats: "Mon Jun 9", "June 9, 2025", "2025-06-09", "06/09/2025", etc.
  const now = new Date();
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    // If year is missing, the parser might default to 2001 etc — fix it
    if (parsed.getFullYear() < 2020) parsed.setFullYear(now.getFullYear());
    return parsed;
  }
  return null;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bDay.getTime() - aDay.getTime()) / msPerDay);
}

export function TimelineChart({ events, assignments }: TimelineChartProps) {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const { eventDots, assignmentDots, maxDay } = useMemo(() => {
    const evts: { day: number; y: number; label: string }[] = [];
    const asns: { day: number; y: number; label: string }[] = [];

    events.forEach((e) => {
      const d = parseDate(e.date);
      if (!d) return;
      const day = daysBetween(today, d);
      if (day >= 0) evts.push({ day, y: 2, label: e.summary });
    });

    assignments.forEach((a) => {
      if (a.dueDate === "N/A") return;
      const d = parseDate(a.dueDate);
      if (!d) return;
      const day = daysBetween(today, d);
      if (day >= 0) asns.push({ day, y: 1, label: `${a.title} (${a.course})` });
    });

    const allDays = [...evts.map((e) => e.day), ...asns.map((a) => a.day)];
    const max = allDays.length > 0 ? Math.max(...allDays) : 7;

    return { eventDots: evts, assignmentDots: asns, maxDay: Math.max(max, 1) };
  }, [events, assignments, today]);

  const formatDay = (day: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + day);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="glass rounded-md px-3 py-2 text-xs">
        <p className="font-medium text-foreground">{data.label}</p>
        <p className="text-muted-foreground">{formatDay(data.day)}</p>
      </div>
    );
  };

  if (eventDots.length === 0 && assignmentDots.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 mb-6 animate-fade-in">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Upcoming Timeline
      </h3>
      <ResponsiveContainer width="100%" height={120}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(225 10% 28% / 0.4)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, maxDay]}
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: "hsl(220 12% 68%)" }}
            axisLine={false}
            tickLine={false}
            ticks={Array.from(
              { length: Math.min(maxDay + 1, 8) },
              (_, i) => Math.round((i * maxDay) / Math.min(maxDay, 7))
            )}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={[0, 3]}
            hide
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            name="Events"
            data={eventDots}
            fill="hsl(265 65% 72%)"
            shape="circle"
            r={6}
          />
          <Scatter
            name="Assignments"
            data={assignmentDots}
            fill="hsl(38 90% 60%)"
            shape="circle"
            r={6}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 px-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-[10px] text-muted-foreground">Events</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-warning" />
          <span className="text-[10px] text-muted-foreground">Assignments</span>
        </div>
      </div>
    </div>
  );
}
