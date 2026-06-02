import { Skeleton } from "@/components/ui/Skeleton";

export default function ListingLoading() {
  return (
    <div className="dnd-container">
      <div className="grid grid-cols-1 items-start gap-12 py-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
        {/* Gallery */}
        <div>
          <Skeleton className="mb-4 aspect-[4/5] w-full" />
          <div className="grid grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        {/* Detail */}
        <div className="space-y-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="surface-card space-y-4 p-8">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}
