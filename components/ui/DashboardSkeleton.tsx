/** Lightweight loading skeleton shown while a dashboard segment streams in. */
export function DashboardSkeleton() {
  return (
    <div className="dnd-container py-12" aria-hidden>
      <div className="h-7 w-56 max-w-full animate-pulse rounded bg-border-soft" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-border-soft/70" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[3px] bg-border-soft/60"
          />
        ))}
      </div>
    </div>
  );
}
