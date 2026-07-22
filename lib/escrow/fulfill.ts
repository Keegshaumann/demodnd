import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import {
  purchaseConfirmationBuyerEmail,
  saleNotificationSellerEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import { escrow } from "@/lib/escrow/config";
import { getEscrowProvider } from "@/lib/escrow/client";
import type { EscrowProvider, EscrowWebhookEvent } from "@/lib/escrow/provider";
import { computeEscrowCharge, escrowEventToStatus } from "@/lib/escrow/logic";
import type { TablesUpdate } from "@/lib/supabase/database.types";

/** The checkout-intent columns escrow fulfilment reads (keyed by orderRef = m_payment_id). */
interface EscrowIntentRow {
  listing_id: string;
  buyer_id: string;
  shipping_name: string | null;
  shipping_address: string | null;
  offer_id: string | null;
  amount_cents: number | null;
  ship_recipient: string | null;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_suburb: string | null;
  ship_city: string | null;
  ship_province: string | null;
  ship_postal_code: string | null;
  ship_phone: string | null;
  pp_quoteno: string | null;
  shipping_amount_cents: number | null;
}

/**
 * Escrow fulfilment — the escrow equivalent of `lib/payfast/fulfill.ts`
 * (ESCROW-COURIER-SPEC.md §7.3). SCAFFOLD: the concrete provider calls
 * (verifyWebhook / getTransaction) are stubbed until Phase 2, so this never runs
 * in the live app yet — the webhook route is gated behind `escrow.enabled`.
 *
 * The escrow-specific atomic order-insert (idempotency keyed on escrow_id,
 * anti-tamper on item+shipping, escrow columns) lives in the DB function
 * `fulfill_escrow_order` (migration 20260722120000), mirroring
 * `fulfill_payfast_order`.
 */

export type EscrowWebhookOutcome =
  | { handled: true }
  | { handled: false; reason: string };

/**
 * Verify + dispatch an inbound webhook. Transient failures THROW so the route
 * returns 5xx and the provider retries (fulfilment is idempotent). Hard-invalid
 * or ignorable events return `{ handled: false }` so the route acks with 200.
 */
export async function handleEscrowWebhook(
  rawBody: string,
  headers: Headers,
  deps: { provider?: EscrowProvider } = {},
): Promise<EscrowWebhookOutcome> {
  const provider = deps.provider ?? getEscrowProvider();

  const verdict = provider.verifyWebhook(rawBody, headers);
  if (!verdict.valid || !verdict.escrowId || !verdict.event) {
    return { handled: false, reason: "webhook did not verify" };
  }

  // Authoritative re-fetch: for a provider without a signed webhook this IS the
  // authenticity check (spec §7.3); for a signed one it is a consistency guard.
  const tx = await provider.getTransaction(verdict.escrowId);

  if (verdict.event === "funded") {
    if (tx.status !== "funded") {
      return { handled: false, reason: `funded webhook but tx status=${tx.status}` };
    }
    if (!tx.orderRef) {
      return { handled: false, reason: "funded tx missing orderRef" };
    }
    return fulfillFundedEscrow(verdict.escrowId, tx.orderRef, provider);
  }

  return applyEscrowStateChange(verdict.escrowId, verdict.event);
}

/**
 * On `funded`: create the order atomically (status='paid', escrow_status='funded'),
 * mark the listing sold, and email buyer + seller. Idempotent — a duplicate
 * webhook for the same escrow_id is a no-op (guarded in `fulfill_escrow_order`).
 *
 * (Phase 5 will additionally book the courier collection here — spec §8.3.)
 */
async function fulfillFundedEscrow(
  escrowId: string,
  orderRef: string,
  provider: EscrowProvider,
): Promise<EscrowWebhookOutcome> {
  void provider; // reserved for Phase 5 (book collection) + provider amount cross-check
  const db = createAdminClient();

  // The checkout intent (written by startEscrowCheckoutAction, keyed by our
  // orderRef = m_payment_id) carries the delivery address, the accepted-offer
  // link + frozen item amount, and the courier quote (0/null in Phase 1).
  const { data: intent } = await db
    .from("checkout_intents")
    .select(
      "listing_id, buyer_id, shipping_name, shipping_address, offer_id, amount_cents, ship_recipient, ship_line1, ship_line2, ship_suburb, ship_city, ship_province, ship_postal_code, ship_phone, pp_quoteno, shipping_amount_cents",
    )
    .eq("m_payment_id", orderRef)
    .maybeSingle<EscrowIntentRow>();
  if (!intent) {
    console.error("escrow fulfil: intent not found", orderRef, escrowId);
    return { handled: false, reason: "intent not found" };
  }

  const { data: listing } = await db
    .from("listings")
    .select("id, seller_id, brand, title, price_cents, fee_rate_bps")
    .eq("id", intent.listing_id)
    .maybeSingle();
  if (!listing) {
    console.error("escrow fulfil: listing not found", intent.listing_id);
    return { handled: false, reason: "listing not found" };
  }

  // Accepted-offer pricing: intent.offer_id + its frozen item amount are the
  // authoritative pair (written server-side into the intent — the provider never
  // round-trips them, so there is no tamper channel as with PayFast custom_str4).
  const agreedCents = intent.offer_id != null ? intent.amount_cents : null;
  const shippingCents = intent.shipping_amount_cents ?? 0;
  const charge = computeEscrowCharge({
    listingPriceCents: listing.price_cents,
    agreedCents,
    shippingCents,
    feeRateBps: listing.fee_rate_bps,
  });

  // Atomic: idempotency (on escrow_id) + anti-tamper (gross == item+shipping) +
  // offer re-validation + active->sold claim + order insert, under the listing
  // row lock. Transient errors re-raise so the route returns 5xx and the provider
  // retries cleanly.
  const { data: outcome, error: rpcError } = await db.rpc("fulfill_escrow_order", {
    p_escrow_id: escrowId,
    p_escrow_provider: escrow.provider,
    p_listing_id: listing.id,
    p_buyer_id: intent.buyer_id,
    p_gross_cents: charge.grossCents,
    p_commission_cents: charge.commissionCents,
    p_payout_cents: charge.sellerPayoutCents,
    p_shipping_cents: charge.shippingCents,
    p_fee_rate_bps: listing.fee_rate_bps,
    p_pp_quoteno: intent.pp_quoteno,
    p_shipping_name: intent.shipping_name,
    p_shipping_address: intent.shipping_address,
    p_ship: {
      recipient: intent.ship_recipient,
      line1: intent.ship_line1,
      line2: intent.ship_line2,
      suburb: intent.ship_suburb,
      city: intent.ship_city,
      province: intent.ship_province,
      postal_code: intent.ship_postal_code,
      phone: intent.ship_phone,
    },
    p_offer_id: intent.offer_id,
    p_agreed_cents: agreedCents,
  });

  if (rpcError) {
    console.error("escrow fulfil: rpc error", orderRef, escrowId, rpcError);
    throw new Error(`fulfill_escrow_order failed: ${rpcError.message}`);
  }

  switch (outcome) {
    case "created":
      break;
    case "duplicate":
      return { handled: true }; // already fulfilled — idempotent no-op
    case "already_sold":
      console.error(
        `escrow fulfil: listing already sold — MANUAL REFUND REQUIRED for escrow_id=${escrowId} (orderRef=${orderRef}), listing=${listing.id}`,
      );
      return { handled: true };
    case "amount_mismatch":
      console.error(
        "escrow fulfil: amount mismatch — refusing",
        orderRef,
        charge.grossCents,
        listing.price_cents,
      );
      return { handled: true };
    case "listing_missing":
      console.error("escrow fulfil: listing vanished mid-fulfil", orderRef, listing.id);
      return { handled: true };
    default:
      console.error("escrow fulfil: unexpected outcome", orderRef, outcome);
      return { handled: true };
  }

  // Address is now on the order — drop the transient intent (best-effort).
  await db.from("checkout_intents").delete().eq("m_payment_id", orderRef);

  // Emails (best-effort) — reuse the existing templates.
  const { data: buyer } = await db
    .from("users")
    .select("email")
    .eq("id", intent.buyer_id)
    .maybeSingle();
  const { data: seller } = await db
    .from("users")
    .select("email")
    .eq("id", listing.seller_id)
    .maybeSingle();

  if (buyer?.email) {
    try {
      await sendEmail({
        to: buyer.email,
        subject: `Order confirmed — ${listing.brand} ${listing.title}`,
        html: purchaseConfirmationBuyerEmail({
          title: listing.title,
          brand: listing.brand,
          grossAmountCents: charge.grossCents,
          orderUrl: `${env.NEXT_PUBLIC_SITE_URL}/buyer`,
        }),
      });
    } catch (err) {
      console.error("escrow fulfil: buyer email failed", err);
    }
  }

  if (seller?.email) {
    try {
      await sendEmail({
        to: seller.email,
        subject: `Your piece sold — ${listing.brand} ${listing.title}`,
        html: saleNotificationSellerEmail({
          title: `${listing.brand} ${listing.title}`,
          grossAmountCents: charge.grossCents,
          sellerPayoutCents: charge.sellerPayoutCents,
          dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/seller`,
        }),
      });
    } catch (err) {
      console.error("escrow fulfil: seller email failed", err);
    }
  }

  return { handled: true };
}

/**
 * On `released` / `refunded` / `disputed` / `cancelled`: mirror the provider's
 * state onto the order by escrow_id, stamping the relevant timestamp (spec §7.3).
 * Order/dispute side-effects beyond the status mirror land in Phase 5.
 */
async function applyEscrowStateChange(
  escrowId: string,
  event: EscrowWebhookEvent,
): Promise<EscrowWebhookOutcome> {
  const db = createAdminClient();
  const { status, timestampColumn } = escrowEventToStatus(event);

  const patch: TablesUpdate<"orders"> = { escrow_status: status };
  if (timestampColumn === "escrow_released_at") {
    patch.escrow_released_at = new Date().toISOString();
  }

  const { error } = await db.from("orders").update(patch).eq("escrow_id", escrowId);
  if (error) {
    console.error("escrow state change: update failed", escrowId, event, error);
    throw new Error(`escrow state change failed: ${error.message}`);
  }
  return { handled: true };
}
