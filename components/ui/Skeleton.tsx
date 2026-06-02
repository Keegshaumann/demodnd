/** Base shimmer block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Placeholder matching a ListingCard's footprint. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[3px] border border-border-soft bg-card">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-3 px-6 pb-[26px] pt-6">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="border-t border-border-soft pt-[18px]">
          <Skeleton className="h-6 w-1/3" />
        </div>
      </div>
    </div>
  );
}

/** A grid of listing-card skeletons. */
export function ListingGridSkeleton({
  count = 8,
  className = "grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
