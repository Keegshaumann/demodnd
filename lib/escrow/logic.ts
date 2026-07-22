import { splitCommission } from "@/lib/money";
import type { EscrowStatus, EscrowWebhookEvent } from "@/lib/escrow/provider";

/**
 * Pure escrow fulfilment logic — NO IO, no `server-only`, so it is unit-testable
 * against a fake provider (ESCROW-COURIER-SPEC.md Phase 1 acceptance). The IO
 * orchestration that calls these lives in `lib/escrow/fulfill.ts`.
 */

export interface EscrowChargeInput {
  /** The listing's live price (integer ZAR cents). */
  listingPriceCents: number;
  /** Frozen accepted-offer amount; overrides the listing price when set. */
  agreedCents?: number | null;
  /** Courier quote (integer ZAR cents). 0 until Phase 4 wires quoting. */
  shippingCents?: number | null;
  /** Locked commission rate (basis points) from the listing. */
  feeRateBps: number;
}

export interface EscrowCharge {
  /** The sale price the seller is credited against (agreed offer, else listing). */
  itemCents: number;
  /** Courier cost — a pass-through to the courier, NOT part of the seller's sale. */
  shippingCents: number;
  /** What the buyer funds into escrow = item + shipping. Anti-tamper target. */
  grossCents: number;
  /** D&D commission, computed on the ITEM only (never on the courier fee). */
  commissionCents: number;
  /** Seller payout = item − commission (shipping is excluded). */
  sellerPayoutCents: number;
}

/**
 * The amount the buyer must fund into escrow: item price (or frozen agreed offer)
 * plus shipping. This is the anti-tamper expectation the fulfil RPC re-checks.
 */
export function expectedEscrowGrossCents(a: EscrowChargeInput): number {
  const itemCents = a.agreedCents ?? a.listingPriceCents;
  return itemCents + (a.shippingCents ?? 0);
}

/**
 * Split an escrow charge into item / shipping / gross / commission / payout.
 * Commission is taken on the ITEM only, so folding a courier fee into the buyer's
 * total never silently shrinks the seller's payout or lets D&D skim the shipping.
 * Invariant: commissionCents + sellerPayoutCents + shippingCents === grossCents.
 */
export function computeEscrowCharge(a: EscrowChargeInput): EscrowCharge {
  const itemCents = a.agreedCents ?? a.listingPriceCents;
  const shippingCents = a.shippingCents ?? 0;
  const grossCents = itemCents + shippingCents;
  const { commissionCents, sellerPayoutCents } = splitCommission(
    itemCents,
    a.feeRateBps,
  );
  return { itemCents, shippingCents, grossCents, commissionCents, sellerPayoutCents };
}

/**
 * Reconcile the offer id stored on the checkout intent with the one the provider
 * echoes back (mirror of the PayFast custom_str4 consistency check in
 * `lib/payfast/fulfill.ts`). A mismatch means the webhook/reference was tampered
 * with, so we refuse the offer-priced path and fall through to the full-price
 * anti-tamper check (which rejects a below-list amount).
 *
 * Returns the offer id to bind (or null), plus whether the binding was consistent.
 */
export function resolveOfferBinding(
  intentOfferId: string | null,
  echoedOfferId: string | null,
): { offerId: string | null; consistent: boolean } {
  const consistent =
    intentOfferId == null || echoedOfferId == null || intentOfferId === echoedOfferId;
  return { offerId: consistent ? intentOfferId : null, consistent };
}

/**
 * Map a post-funding webhook event to the escrow_status it drives + whether it
 * also stamps a timestamp column. `funded` is handled by the order-creation path
 * (`fulfill.ts`), not here; the rest are simple state mirrors (spec §7.3).
 */
export function escrowEventToStatus(event: EscrowWebhookEvent): {
  status: EscrowStatus;
  timestampColumn: "escrow_released_at" | null;
} {
  switch (event) {
    case "funded":
      return { status: "funded", timestampColumn: null };
    case "released":
      return { status: "released", timestampColumn: "escrow_released_at" };
    case "refunded":
      return { status: "refunded", timestampColumn: null };
    case "disputed":
      return { status: "disputed", timestampColumn: null };
    case "cancelled":
      return { status: "cancelled", timestampColumn: null };
  }
}
