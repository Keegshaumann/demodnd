import { Skeleton, ListingGridSkeleton } from "@/components/ui/Skeleton";

export default function BrowseLoading() {
  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 48px" }}>
        <div className="dnd-container space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-1/2 max-w-lg" />
        </div>
      </header>
      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-10 py-16 lg:grid-cols-[280px_1fr] lg:gap-14">
          <aside className="hidden space-y-8 lg:block">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </aside>
          <main className="min-w-0">
            <div className="mb-9 flex items-center justify-between border-b border-border-soft pb-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-48" />
            </div>
            <ListingGridSkeleton
              count={6}
              className="grid grid-cols-1 gap-9 sm:grid-cols-2 xl:grid-cols-3"
            />
          </main>
        </div>
      </div>
    </>
  );
}
