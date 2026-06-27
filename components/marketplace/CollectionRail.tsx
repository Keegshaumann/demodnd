import Link from "next/link";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Carousel } from "@/components/marketplace/Carousel";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { ListingCardData } from "@/lib/marketplace/listings";

/**
 * A titled merchandising rail of listing cards with a "View all" link.
 *
 * Used for CURATED COLLECTIONS / EDITS (feature 10) and the "New In" rail
 * (feature 13). A plain server component — it just lays out cards the page
 * fetched. Reuses <ListingCard> (read-only; lane C owns it) and the same
 * scroll-snap responsive ladder as CategoryRail so it never overflows at 390px:
 *   <640px  → horizontal scroll-snap rail (a neighbour peeks → "swipe" cue)
 *   640px+  → 2-up grid
 *   1024px+ → up-to-4-up row
 *
 * Renders nothing when `items` is empty, so an out-of-stock edit silently drops
 * off the page rather than showing a dead heading.
 *
 * `savedIds` hydrates each card's FavouriteButton; pass an empty Set for guests.
 * createdAt/saveCount/viewCount are intentionally NOT plumbed here — homepage
 * rails keep the card badge inputs optional, so badges simply don't render on
 * these previews (matches the plan).
 */
export function CollectionRail({
  title,
  eyebrow,
  href,
  viewAllLabel = "See all",
  items,
  savedIds,
}: {
  title: string;
  eyebrow?: string;
  href: string;
  viewAllLabel?: string;
  items: ListingCardData[];
  savedIds: Set<string>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border-soft" style={{ padding: "72px 0 80px" }}>
      <div className="dnd-container">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
            <h2 className="font-serif" style={{ fontSize: "clamp(28px,3.4vw,40px)" }}>
              {title}
            </h2>
          </div>
          <Link href={href} className="btn btn-outline btn-sm shrink-0">
            {viewAllLabel} <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>

        {/* One tidy horizontal row (Vestiaire-style) — scroll via the arrows on
            desktop, swipe on mobile. "See all" above opens the full edit. */}
        <Carousel>
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} isSaved={savedIds.has(l.id)} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
