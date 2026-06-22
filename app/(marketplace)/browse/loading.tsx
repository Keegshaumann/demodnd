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
      <div className="dnd-container py-12 lg:py-14">
        {/* Horizontal filter bar skeleton (matches the new top-aligned facets) */}
        <div className="mb-9 flex flex-wrap items-center gap-3 border-b border-border-soft pb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
          <Skeleton className="ml-auto h-9 w-48" />
        </div>
        <ListingGridSkeleton
          count={9}
          className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        />
      </div>
    </>
  );
}
