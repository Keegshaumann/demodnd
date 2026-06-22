import Link from "next/link";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { HeartIcon, ArrowRightIcon } from "@/components/ui/icons";
import type { ListingCardData } from "@/lib/marketplace/listings";

/**
 * The buyer's saved pieces ("favourites") as a card grid — the same editorial
 * grid the browse page uses. Every card here is, by definition, saved, so each
 * ListingCard gets `isSaved` so the heart renders filled and unsaving from this
 * tab is one click. Empty state mirrors the marketplace's dashed-border card.
 */
export function SavedPieces({ listings }: { listings: ListingCardData[] }) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[3px] border border-dashed border-border bg-surface px-6 py-20 text-center">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink-dim">
          <HeartIcon width={20} height={20} />
        </span>
        <h2 className="font-serif text-2xl">No saved pieces yet.</h2>
        <p className="mt-2 max-w-[380px] text-[14px] text-ink-muted">
          Tap the heart on any piece to keep it here. We&apos;ll hold your
          favourites so you can return to them anytime.
        </p>
        <div className="mt-6">
          <Link href="/browse" className="btn btn-primary btn-sm">
            Browse the collection <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((l, i) => (
        <Reveal key={l.id} delay={Math.min(i, 6) * 45}>
          <ListingCard listing={l} isSaved />
        </Reveal>
      ))}
    </div>
  );
}
