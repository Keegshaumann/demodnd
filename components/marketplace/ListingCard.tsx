import Link from "next/link";
import Image from "next/image";
import { formatZar } from "@/lib/money";
import { categoryLabel } from "@/lib/marketplace/constants";
import { CertificateIcon } from "@/components/ui/icons";
import type { ListingCardData } from "@/lib/marketplace/listings";

/** Marketplace listing card — mirrors `.listing-card` from the demo. */
export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group relative block overflow-hidden rounded-[3px] border border-border-soft bg-card transition-all duration-500 ease-out-soft hover:-translate-y-1.5 hover:border-gold/10 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-deep">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={`${listing.brand} ${listing.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 290px"
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-dim">
            <CertificateIcon width={32} height={32} />
          </div>
        )}
        <span className="pill absolute left-4 top-4">
          <CertificateIcon width={11} height={11} /> Authenticated
        </span>
      </div>

      <div className="px-6 pb-[26px] pt-6">
        <div className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.24em] text-gold">
          {listing.brand}
        </div>
        <div className="mb-2 font-serif text-[22px] leading-tight">
          {listing.title}
        </div>
        <div className="mb-[18px] flex flex-wrap gap-2 text-[12px] tracking-wide text-ink-dim">
          <span>{categoryLabel(listing.category)}</span>
          <span>·</span>
          <span>{listing.condition}</span>
          {listing.year && (
            <>
              <span>·</span>
              <span>{listing.year}</span>
            </>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-border-soft pt-[18px]">
          <div className="font-serif text-[22px] leading-none">
            {formatZar(listing.priceCents)}
          </div>
        </div>
      </div>
    </Link>
  );
}
