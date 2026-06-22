import Link from "next/link";
import Image from "next/image";
import { formatZar } from "@/lib/money";
import {
  brandedTitle,
  categoryLabel,
  processBadgeLabel,
} from "@/lib/marketplace/constants";
import { CertificateIcon, ArrowRightIcon } from "@/components/ui/icons";
import { FavouriteButton } from "@/components/marketplace/FavouriteButton";
import type { ListingCardData } from "@/lib/marketplace/listings";

/**
 * Editorial marketplace listing card. Full border at rest (no decorative
 * border+shadow stack); on hover it lifts with a single defined shadow, the
 * image zooms, and a "View piece" affordance fades up over the photo. Price is
 * ink-strong, never washed grey. Pass `priority` for above-the-fold cards so
 * the LCP image is preloaded instead of lazy-loaded.
 *
 * `isSaved` hydrates the top-right FavouriteButton island (the whole tile is a
 * <Link>; the button stops propagation so a save never navigates). A `sold`
 * piece dims the photo, swaps the hover "View piece" affordance for a
 * monochrome "Sold" status pill, and is otherwise still a working link.
 */
export function ListingCard({
  listing,
  priority = false,
  isSaved = false,
}: {
  listing: ListingCardData;
  priority?: boolean;
  isSaved?: boolean;
}) {
  const sold = listing.status === "sold";

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group relative block overflow-hidden rounded-[3px] border border-border-soft bg-card transition-[transform,box-shadow,border-color] duration-500 ease-out-soft hover:-translate-y-1.5 hover:border-border hover:shadow-xl"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-deep">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={brandedTitle(listing)}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
            className={`object-cover transition-transform duration-[900ms] ease-out-soft group-hover:scale-[1.06] ${
              sold ? "opacity-60 grayscale" : ""
            }`}
          />
        ) : (
          <div
            className={`flex h-full items-center justify-center text-ink-dim ${
              sold ? "opacity-60 grayscale" : ""
            }`}
          >
            <CertificateIcon width={32} height={32} />
          </div>
        )}

        <span className="pill pill-glass absolute left-4 top-4">
          <CertificateIcon width={11} height={11} />{" "}
          {processBadgeLabel(listing.category)}
        </span>

        <FavouriteButton
          listingId={listing.id}
          isSavedInitial={isSaved}
          variant="card"
        />

        {sold ? (
          /* Sold pieces can still be opened (provenance, "similar" rails) but
             are visibly out of stock — a quiet monochrome status pill, never the
             gold/black accent, sits over the dimmed photo in place of the
             "View piece" affordance. */
          <span className="absolute bottom-4 left-4 inline-flex items-center rounded-full border border-border bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-dim backdrop-blur-[6px]">
            Sold
          </span>
        ) : (
          /* Hover affordance — fades up over the photo. Decorative (whole card is
              the link); hidden on touch where there is no hover. */
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center pb-5 pt-12 opacity-0 transition-opacity duration-500 ease-out-soft group-hover:opacity-100"
            style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.55))" }}
          >
            <span className="flex translate-y-2 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-transform duration-500 ease-out-soft group-hover:translate-y-0">
              View piece <ArrowRightIcon width={14} height={14} />
            </span>
          </div>
        )}
      </div>

      <div className="px-6 pb-[26px] pt-6">
        <div className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.24em] text-gold">
          {listing.brand}
        </div>
        <div className="mb-2 font-serif text-[22px] leading-tight text-ink transition-colors duration-300 group-hover:text-gold-soft">
          {listing.title}
        </div>
        <div className="mb-[18px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] tracking-wide text-ink-dim">
          <span>{categoryLabel(listing.category)}</span>
          <span aria-hidden className="text-border">·</span>
          <span>{listing.condition}</span>
          {listing.year && (
            <>
              <span aria-hidden className="text-border">·</span>
              <span>{listing.year}</span>
            </>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-border-soft pt-[18px]">
          <div className="price text-[23px] leading-none">
            {formatZar(listing.priceCents)}
          </div>
        </div>
      </div>
    </Link>
  );
}
