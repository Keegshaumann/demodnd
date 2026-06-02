import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getListingById } from "@/lib/marketplace/listings";
import { getCurrentUser } from "@/lib/auth/guards";
import { roleCanAccess } from "@/lib/auth/roles";
import { createListingPaymentIntent } from "@/lib/stripe/checkout";
import { formatZar } from "@/lib/money";
import { categoryLabel } from "@/lib/marketplace/constants";
import { CheckoutForm } from "@/components/marketplace/CheckoutForm";
import { CertificateIcon, ChevronRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/signin?redirect=/checkout/${listingId}`);
  // BUY-1: only buyer accounts (admins pass as superuser) may purchase — the
  // order + "confirm receipt" views live under the buyer-only area, so a
  // seller-role buyer would be locked out of the very order they paid for.
  if (!roleCanAccess(user.role, "buyer")) redirect(`/listing/${listingId}`);

  const listing = await getListingById(listingId);
  if (!listing) notFound();

  // Can't buy your own piece; only active listings are purchasable.
  if (listing.seller_id === user.id) redirect(`/listing/${listing.id}`);
  if (listing.status !== "active") redirect(`/listing/${listing.id}`);

  const { clientSecret, amountCents } = await createListingPaymentIntent({
    listing,
    buyerId: user.id,
  });

  const cover = listing.images[0]?.url ?? null;

  return (
    <div className="dnd-container py-12">
      <nav className="mb-8 flex items-center gap-2 text-[12px] text-ink-dim">
        <Link href="/browse" className="hover:text-ink">
          Shop
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <Link href={`/listing/${listing.id}`} className="hover:text-ink">
          {listing.brand}
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <span className="text-ink-muted">Checkout</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {/* Order summary */}
        <div className="lg:sticky lg:top-24">
          <div className="eyebrow mb-5">Your order</div>
          <div className="surface-card overflow-hidden">
            <div className="flex gap-5 p-5">
              <div className="relative h-28 w-24 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
                {cover ? (
                  <Image
                    src={cover}
                    alt={`${listing.brand} ${listing.title}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-dim">
                    <CertificateIcon width={24} height={24} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.24em] text-gold">
                  {listing.brand}
                </div>
                <div className="font-serif text-xl">{listing.title}</div>
                <div className="mt-1 text-[12px] text-ink-dim">
                  {categoryLabel(listing.category)} · {listing.condition}
                </div>
              </div>
            </div>
            <dl className="space-y-2 border-t border-border-soft p-5 text-sm">
              <Row label="Item" value={formatZar(listing.price_cents)} />
              <Row label="Delivery" value="White-glove · included" />
              <div className="flex items-center justify-between border-t border-border-soft pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-serif text-2xl text-silver">
                  {formatZar(listing.price_cents)}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-muted">
            <CertificateIcon width={15} height={15} className="mt-0.5 text-gold" />
            Authenticated by D&amp;D Luxury and insured in transit. 14-day returns.
          </p>
        </div>

        {/* Payment */}
        <div className="surface-card p-7 sm:p-8">
          <CheckoutForm clientSecret={clientSecret} amountCents={amountCents} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-muted">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
