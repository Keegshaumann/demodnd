import Link from "next/link";
import { getSellerReputation } from "@/lib/marketplace/seller-reputation";
import { AUTH_METHOD_LABELS } from "@/lib/marketplace/constants";
import { StarIcon, StarFilledIcon, CheckCircleIcon } from "@/components/ui/icons";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-gold">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rounded ? (
          <StarFilledIcon key={n} width={13} height={13} />
        ) : (
          <StarIcon key={n} width={13} height={13} />
        ),
      )}
    </span>
  );
}

/** Seller reputation widget shown on the listing detail page. */
export async function SellerReputation({ sellerId }: { sellerId: string }) {
  const rep = await getSellerReputation(sellerId);
  if (!rep) return null;

  const name = rep.displayName ?? rep.username ?? "D&D Seller";
  const memberSince = rep.memberSince
    ? new Date(rep.memberSince).getFullYear()
    : null;

  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border bg-bg font-serif text-lg text-ink">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-serif text-lg">
            {name}
            <CheckCircleIcon
              width={15}
              height={15}
              className="text-gold"
              aria-label="Verified seller"
            />
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            <Stars rating={rep.rating} />
            {rep.reviewsCount > 0 ? (
              <span>
                {rep.rating.toFixed(2)} ({rep.reviewsCount})
              </span>
            ) : (
              <span>New seller</span>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border-soft pt-4 text-center">
        <Stat value={rep.itemsListed} label="Listed" />
        <Stat value={rep.completedTransactions} label="Sold" />
        <Stat value={memberSince ?? "—"} label="Since" />
      </dl>

      {rep.primaryAuthMethod && (
        <div className="mt-4 text-center text-[11px] uppercase tracking-[0.16em] text-ink-dim">
          {AUTH_METHOD_LABELS[rep.primaryAuthMethod]}
        </div>
      )}

      {rep.username && (
        <Link
          href={`/seller/${rep.username}`}
          className="btn btn-outline btn-sm btn-block mt-5"
        >
          View seller profile
        </Link>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="font-serif text-2xl text-silver">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
    </div>
  );
}
