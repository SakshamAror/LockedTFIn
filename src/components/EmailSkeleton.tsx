import { Skeleton } from "@/components/ui/skeleton";

export function EmailSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass rounded-xl overflow-hidden animate-fade-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton className="h-[2px] w-full" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-2 shrink-0 mt-1">
                <Skeleton className="h-3 w-4 rounded" />
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <div className="flex gap-2 mt-1">
                  <Skeleton className="h-4 w-14 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
