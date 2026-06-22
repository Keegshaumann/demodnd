"use client";

import { useState } from "react";
import Link from "next/link";
import { formatZar } from "@/lib/money";
import { isPayWindowOpen } from "@/lib/offers/expiry";
import type { OfferState } from "@/lib/supabase/database.types";
import type { PdpOfferState } from "@/lib/offers/queries";
import { MakeOfferModal } from "@/components/marketplace/MakeOfferModal";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * The PDP "Make an offer" control, shown under the buy CTA on the buy-card. It
 * is the buyer-facing entry point to structured offers and renders one of three
 * states:
 *
 *   - existingOffer present → a compact status chip for the buyer's open offer,
 *     plus a "Pay {agreed}" link when it's accepted and still in its 24h pay
 *     window (mirrors BuyerOfferRow's pay affordance).
 *   - signed-out → a "Sign in to make an offer" link to /signin?redirect=…
 *   - eligible buyer, no open offer → a secondary "Make an offer" button that
 *     opens MakeOfferModal.
 *
 * `disabledReason` mirrors the PDP's buy-blocked logic so offers and purchases
 * stay in lockstep: hidden entirely for the owner, a sold piece, an inactive
 * listing, or a non-buyer/ineligible account (those simply can't offer).
 */

const CHIP: Record<OfferState, { label: string; cls: string }> = {
  pending: { label: "Offer pending", cls: "border-amber-300 text-amber-700" },
  countered: { label: "Seller countered", cls: "border-blue-300 text-blue-700" },
  accepted: { label: "Offer accepted", cls: "border-emerald-300 text-emerald-700" },
  declined: { label: "Offer declined", cls: "border-rose-300 text-rose-700" },
  expired: { label: "Offer expired", cls: "border-ink-dim/40 text-ink-dim" },
  withdrawn: { label: "Offer withdrawn", cls: "border-ink-dim/40 text-ink-dim" },
};

export type OfferDisabledReason =
  | "guest"
  | "owner"
  | "role"
  | "status"
  | "sold"
  | null;

export function MakeOfferButton({
  listingId,
  priceCents,
  floorCents,
  existingOffer,
  disabledReason,
}: {
  listingId: string;
  priceCents: number;
  floorCents: number;
  existingOffer: PdpOfferState | null;
  disabledReason: OfferDisabledReason;
}) {
  const [open, setOpen] = useState(false);

  // The owner, a sold piece, an inactive listing, or an ineligible (non-buyer /
  // suspended) account never see an offer affordance — parity with buyBlocked.
  if (
    disabledReason === "owner" ||
    disabledReason === "sold" ||
    disabledReason === "status" ||
    disabledReason === "role"
  ) {
    return null;
  }

  // An existing open offer takes over from the button: show its status + (when
  // accepted & still payable) a link into the agreed-price checkout.
  if (existingOffer) {
    const chip = CHIP[existingOffer.state];
    const payable =
      existingOffer.state === "accepted" &&
      existingOffer.agreedAmountCents != null &&
      isPayWindowOpen({
        state: existingOffer.state,
        pay_deadline_at: existingOffer.payDeadlineAt,
      });

    return (
      <div className="mt-3 rounded-[3px] border border-border-soft bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-ink-muted">
            Your offer {formatZar(existingOffer.amountCents)}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] ${chip.cls}`}
          >
            {chip.label}
          </span>
        </div>
        {existingOffer.state === "countered" &&
          existingOffer.counterAmountCents != null && (
            <p className="mt-2 text-[12.5px] text-ink-muted">
              Seller countered at {formatZar(existingOffer.counterAmountCents)}.{" "}
              <Link href="/buyer/offers" className="text-gold underline">
                Respond in your offers
              </Link>
            </p>
          )}
        {payable ? (
          <Link
            href={`/checkout/${listingId}?offer=${existingOffer.id}`}
            className="btn btn-primary btn-block mt-3"
          >
            Pay {formatZar(existingOffer.agreedAmountCents ?? existingOffer.amountCents)}{" "}
            <ArrowRightIcon width={16} height={16} />
          </Link>
        ) : (
          <Link
            href="/buyer/offers"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-gold hover:underline"
          >
            View in your offers <ArrowRightIcon width={13} height={13} />
          </Link>
        )}
      </div>
    );
  }

  // Guests get a sign-in prompt that returns to this PDP.
  if (disabledReason === "guest") {
    return (
      <Link
        href={`/signin?redirect=/listing/${listingId}`}
        className="btn btn-outline btn-block mt-3"
      >
        Sign in to make an offer
      </Link>
    );
  }

  // Eligible buyer, no open offer → open the modal.
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-block mt-3"
      >
        Make an offer
      </button>
      {open && (
        <MakeOfferModal
          listingId={listingId}
          priceCents={priceCents}
          floorCents={floorCents}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
