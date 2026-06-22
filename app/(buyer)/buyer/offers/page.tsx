import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { getBuyerOffers } from "@/lib/offers/queries";
import { BuyerTabs } from "@/components/buyer/BuyerTabs";
import { BuyerOfferRow } from "@/components/buyer/BuyerOfferRow";

export const metadata: Metadata = { title: "My Offers" };

export default async function BuyerOffersPage() {
  const user = await requireRole("buyer");
  const offers = await getBuyerOffers(user.id);

  return (
    <div>
      <header className="mb-2">
        <p className="eyebrow mb-3">My account</p>
        <h1 className="font-serif text-[34px]">My offers</h1>
        <p className="mt-2 max-w-[620px] text-sm text-ink-muted">
          Offers you&apos;ve made on pieces. Sellers have 48 hours to respond. If
          your offer is accepted, you have 24 hours to pay the agreed price before
          the piece returns to full price.
        </p>
      </header>
      <BuyerTabs />

      {offers.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          You haven&apos;t made any offers yet.{" "}
          <Link href="/browse" className="text-gold hover:underline">
            Browse the collection
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <BuyerOfferRow key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}
