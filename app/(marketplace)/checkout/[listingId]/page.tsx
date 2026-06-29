import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getListingById } from "@/lib/marketplace/listings";
import { getCurrentUser } from "@/lib/auth/guards";
import { roleCanAccess } from "@/lib/auth/roles";
import { payfast } from "@/lib/payfast/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatZar } from "@/lib/money";
import { categoryLabel, processBadgeLabel } from "@/lib/marketplace/constants";
import { CheckoutForm } from "@/components/marketplace/CheckoutForm";
import {
  CertificateIcon,
  ChevronRightIcon,
  LockIcon,
  TruckIcon,
  RotateIcon,
  CheckIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Checkout" };

const STEPS = ["Selected", "Your details", "Secure payment"] as const;

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ offer?: string }>;
}) {
  const { listingId } = await params;
  const { offer: offerParam } = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    const target = offerParam
      ? `/checkout/${listingId}?offer=${offerParam}`
      : `/checkout/${listingId}`;
    redirect(`/signin?redirect=${encodeURIComponent(target)}`);
  }
  // BUY-1: only buyer accounts (admins pass as superuser) may purchase — the
  // order + "confirm receipt" views live under the buyer-only area.
  if (!roleCanAccess(user.role, "buyer")) redirect(`/listing/${listingId}`);
  // Suspended/banned accounts can't transact (this route isn't middleware-gated).
  if (user.status !== "active") redirect(`/listing/${listingId}`);

  const listing = await getListingById(listingId);
  if (!listing) notFound();

  // Can't buy your own piece; only active listings are purchasable.
  if (listing.seller_id === user.id) redirect(`/listing/${listing.id}`);
  if (listing.status !== "active") redirect(`/listing/${listing.id}`);

  // Accepted-offer checkout: re-validate the offer server-side (SAME predicate as
  // startPayfastCheckoutAction) and render the order at the agreed price. A
  // tampered/hijacked ?offer= link simply falls back to the full-price flow — the
  // server action and the fulfilment RPC re-check this independently, so the page
  // render is purely for display. We never trust the link for pricing.
  let offerId: string | undefined;
  let agreedCents: number | null = null;
  if (offerParam) {
    const db = createAdminClient();
    const { data: offer } = await db
      .from("offers")
      .select(
        "id, listing_id, buyer_id, state, agreed_amount_cents, pay_deadline_at",
      )
      .eq("id", offerParam)
      .maybeSingle();
    const payWindowOpen =
      offer?.pay_deadline_at != null &&
      Date.now() <= new Date(offer.pay_deadline_at).getTime();
    if (
      offer &&
      offer.buyer_id === user.id &&
      offer.listing_id === listing.id &&
      offer.state === "accepted" &&
      offer.agreed_amount_cents != null &&
      payWindowOpen
    ) {
      offerId = offer.id;
      agreedCents = offer.agreed_amount_cents;
    }
    // If validation fails we silently render the full-price checkout. (The buyer
    // can still buy at list price; they'd reach this page from the offer "Pay"
    // link only while the window is open, so a fall-through means it lapsed.)
  }

  // Price shown + charged: the agreed amount when paying a valid accepted offer,
  // otherwise the listing price.
  const chargeCents = agreedCents ?? listing.price_cents;
  const isAgreedOffer = offerId != null;

  const cover = listing.images[0]?.url ?? null;

  return (
    <div className="dnd-container py-10 lg:py-12">
      <nav className="mb-6 flex items-center gap-2 text-[12px] text-ink-dim">
        <Link href="/browse" className="hover:text-ink">
          Shop
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <Link href={`/listing/${listing.id}`} className="truncate hover:text-ink">
          {listing.brand}
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <span className="text-ink-muted">Checkout</span>
      </nav>

      {/* Step indicator */}
      <ol className="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.16em]">
        {STEPS.map((label, i) => {
          const current = i === 1; // address-entry step
          const done = i < 1;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex items-center gap-2 ${
                  current ? "text-ink" : done ? "text-ink-muted" : "text-ink-dim"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    current
                      ? "border-gold bg-gold text-white"
                      : "border-border text-ink-dim"
                  }`}
                >
                  {done ? <CheckIcon width={11} height={11} /> : i + 1}
                </span>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="h-px w-6 bg-border sm:w-10" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {/* Order summary */}
        <div className="lg:sticky lg:top-24">
          <div className="eyebrow mb-5">Your order</div>
          <div className="surface-card overflow-hidden">
            <div className="flex gap-5 p-5">
              <div className="relative h-32 w-[104px] flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
                {cover ? (
                  <Image
                    src={cover}
                    alt={`${listing.brand} ${listing.title}`}
                    fill
                    sizes="104px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-dim">
                    <CertificateIcon width={24} height={24} />
                  </div>
                )}
                <span className="pill pill-glass absolute left-2 top-2 !px-2 !py-1 !text-[8px]">
                  <CertificateIcon width={9} height={9} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.24em] text-gold">
                  {listing.brand}
                </div>
                <div className="font-serif text-xl leading-tight">{listing.title}</div>
                <div className="mt-1.5 text-[12px] text-ink-dim">
                  {categoryLabel(listing.category)} · {listing.condition}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                  <CertificateIcon width={11} height={11} />
                  {processBadgeLabel(listing.category)}
                </div>
                {isAgreedOffer ? (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="price text-[19px]">{formatZar(chargeCents)}</span>
                    <span className="text-[12px] text-ink-dim line-through">
                      {formatZar(listing.price_cents)}
                    </span>
                  </div>
                ) : (
                  <div className="price mt-3 text-[19px]">
                    {formatZar(listing.price_cents)}
                  </div>
                )}
              </div>
            </div>
            <dl className="space-y-2.5 border-t border-border-soft p-5 text-sm">
              <Row
                label={isAgreedOffer ? "Agreed offer" : "Item"}
                value={formatZar(chargeCents)}
              />
              <Row label="White-glove delivery" value="Included" />
              <Row label="Insurance in transit" value="Included" />
              <div className="mt-1 flex items-center justify-between border-t border-border-soft pt-4">
                <dt className="font-medium uppercase tracking-[0.14em] text-[11px] text-ink-muted">
                  Total
                </dt>
                <dd className="price text-[26px] leading-none">
                  {formatZar(chargeCents)}
                </dd>
              </div>
            </dl>
          </div>

          {isAgreedOffer && (
            <p className="mt-4 rounded-[3px] border border-border-soft bg-deep px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-muted">
              You&apos;re paying the agreed offer price. This price is reserved for
              you only while your 24-hour window is open — complete payment to
              secure the piece.
            </p>
          )}

          <ul className="mt-5 space-y-2.5">
            {[
              { icon: CertificateIcon, text: "Certificate of Authenticity included" },
              { icon: LockIcon, text: "Insured to R500,000 in transit" },
              { icon: TruckIcon, text: "White-glove delivery, nationwide" },
              { icon: RotateIcon, text: "14-day returns if not as described" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[12.5px] text-ink-muted">
                <Icon width={14} height={14} className="mt-0.5 flex-shrink-0 text-gold" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Payment */}
        <div className="surface-card p-7 sm:p-9">
          <h1 className="mb-2 font-serif text-[28px]">Delivery &amp; payment</h1>
          <p className="mb-7 max-w-[48ch] text-[13.5px] leading-relaxed text-ink-muted">
            Tell us where to deliver, then complete payment on{" "}
            <strong className="text-ink">PayFast</strong>, South Africa&apos;s
            trusted gateway, by card or Instant EFT.
          </p>

          <CheckoutForm
            listingId={listing.id}
            priceCents={chargeCents}
            offerId={offerId}
            sandbox={payfast.mode === "sandbox"}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-muted">
      <dt>{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
