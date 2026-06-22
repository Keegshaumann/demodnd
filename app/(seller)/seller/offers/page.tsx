import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getSellerOffers } from "@/lib/offers/queries";
import { SellerOfferRow } from "@/components/seller/SellerOfferRow";

export const metadata: Metadata = { title: "Offers" };

export default async function SellerOffersPage() {
  const user = await requireRole("seller");
  const offers = await getSellerOffers(user.id);

  const awaiting = offers.filter((o) => !o.isExpired && o.state === "pending").length;
  const countered = offers.filter((o) => !o.isExpired && o.state === "countered").length;

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Negotiation</p>
        <h1 className="font-serif text-[34px]">Offers on your pieces</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Buyers can make a structured offer of at least 70% of the list price.
          Accept to give the buyer a 24-hour window to pay the agreed amount,
          counter with your own ask, or decline. Your piece stays on sale at full
          price until a buyer pays — accepting an offer never takes it off the
          market.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Awaiting you" value={String(awaiting)} />
        <Stat label="Countered" value={String(countered)} />
        <Stat label="Total offers" value={String(offers.length)} />
      </div>

      {offers.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          No offers yet. They appear here when a buyer offers below your list price.
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((o) => (
            <SellerOfferRow key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1.5 font-serif text-2xl text-ink">{value}</div>
    </div>
  );
}
