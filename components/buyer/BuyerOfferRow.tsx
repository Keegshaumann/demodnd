"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatZar } from "@/lib/money";
import { isPayWindowOpen } from "@/lib/offers/expiry";
import { acceptCounterAction, withdrawOfferAction } from "@/lib/offers/actions";
import { CertificateIcon } from "@/components/ui/icons";
import type { BuyerOfferView } from "@/lib/offers/queries";
import type { OfferState } from "@/lib/supabase/database.types";

/**
 * One row in the buyer's offers list. Shows the item, the buyer's offer, the
 * effective state chip, the live deadline (48h response window, or the 24h pay
 * window once accepted), and the actions allowed in the current state:
 *   countered  → Accept counter (acceptCounterAction) + Withdraw
 *   pending    → Withdraw (withdrawOfferAction)
 *   accepted   → Pay now (→ accepted-offer checkout) while the pay window is open
 *   terminal   → read-only chip
 *
 * Buyer-side "decline" is a withdraw (the plan: a buyer declining = withdraw), so
 * there is no separate decline control here. Chip styling lives inline (no shared
 * chip component, to keep lanes disjoint).
 */

const CHIP: Record<OfferState, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "border-amber-300 text-amber-700" },
  countered: { label: "Countered", cls: "border-blue-300 text-blue-700" },
  accepted: { label: "Accepted", cls: "border-emerald-300 text-emerald-700" },
  declined: { label: "Declined", cls: "border-rose-300 text-rose-700" },
  expired: { label: "Expired", cls: "border-ink-dim/40 text-ink-dim" },
  withdrawn: { label: "Withdrawn", cls: "border-ink-dim/40 text-ink-dim" },
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BuyerOfferRow({ offer }: { offer: BuyerOfferView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const payWindowOpen =
    offer.state === "accepted" &&
    isPayWindowOpen({ state: offer.state, pay_deadline_at: offer.payDeadlineAt });
  // An accepted offer whose 24h pay window lapsed unpaid. The lazy sweep flips such
  // rows to 'expired' to free the one-open-offer slot, so detect both the freshly-
  // accepted (sweep not yet run) and the already-swept ('expired' with a frozen
  // agreed amount) cases — anything once accepted has agreedAmountCents set.
  const payWindowLapsed =
    !offer.isPaid &&
    !payWindowOpen &&
    offer.agreedAmountCents != null &&
    (offer.state === "accepted" || offer.state === "expired");
  // Buyer can still act while pending/countered and not yet expired.
  const canWithdraw =
    (offer.state === "pending" || offer.state === "countered") && !offer.isExpired;
  const canAcceptCounter =
    offer.state === "countered" &&
    !offer.isExpired &&
    offer.counterAmountCents != null;

  const chip = offer.isPaid
    ? { label: "Paid", cls: "border-emerald-300 text-emerald-700" }
    : payWindowLapsed
      ? { label: "Offer expired (unpaid)", cls: "border-ink-dim/40 text-ink-dim" }
      : CHIP[offer.state];

  // The live deadline shown under the chip: the 24h pay window once accepted (and
  // still open), otherwise the 48h response window for pending/countered offers.
  const deadlineIso =
    payWindowOpen && offer.payDeadlineAt
      ? offer.payDeadlineAt
      : offer.state === "pending" || offer.state === "countered"
        ? offer.expiresAt
        : null;
  const deadlineLabel = payWindowOpen ? "Pay by" : "Responds by";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  return (
    <div className="surface-card p-4">
      <div className="flex items-start gap-5">
        <Link
          href={`/listing/${offer.listingId}`}
          className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep"
        >
          {offer.imageUrl ? (
            <Image
              src={offer.imageUrl}
              alt={`${offer.itemBrand} ${offer.itemTitle}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-dim">
              <CertificateIcon width={20} height={20} />
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
            {offer.itemBrand}
          </div>
          <Link
            href={`/listing/${offer.listingId}`}
            className="block truncate font-serif text-lg hover:underline"
          >
            {offer.itemTitle}
          </Link>
          <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-[12px] text-ink-muted">
            <div className="flex gap-1.5">
              <dt className="text-ink-dim">List</dt>
              <dd>{formatZar(offer.priceCents)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-ink-dim">Your offer</dt>
              <dd>{formatZar(offer.amountCents)}</dd>
            </div>
            {offer.counterAmountCents != null && (
              <div className="flex gap-1.5">
                <dt className="text-ink-dim">Counter</dt>
                <dd>{formatZar(offer.counterAmountCents)}</dd>
              </div>
            )}
            {offer.agreedAmountCents != null && (
              <div className="flex gap-1.5">
                <dt className="text-ink-dim">Agreed</dt>
                <dd>{formatZar(offer.agreedAmountCents)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-2 text-right">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] ${chip.cls}`}
          >
            {chip.label}
          </span>
          {deadlineIso && (
            <span className="text-[11px] text-ink-dim">
              {deadlineLabel} {fmtDateTime(deadlineIso)}
            </span>
          )}
        </div>
      </div>

      {(canWithdraw || canAcceptCounter || payWindowOpen) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
          {payWindowOpen && (
            <Link
              href={`/checkout/${offer.listingId}?offer=${offer.id}`}
              className="btn btn-primary"
            >
              Pay {formatZar(offer.agreedAmountCents ?? offer.amountCents)}
            </Link>
          )}
          {canAcceptCounter && (
            <button
              type="button"
              onClick={() => run(() => acceptCounterAction({ offerId: offer.id }))}
              disabled={pending}
              className="btn btn-primary"
            >
              {pending ? "Working…" : "Accept counter"}
            </button>
          )}
          {canWithdraw && (
            <button
              type="button"
              onClick={() => run(() => withdrawOfferAction({ offerId: offer.id }))}
              disabled={pending}
              className="btn btn-outline"
            >
              {pending ? "Working…" : "Withdraw"}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-[#e85d5d]">{error}</p>}
    </div>
  );
}
