"use server";

import { getCurrentUser } from "@/lib/auth/guards";
import { roleCanAccess } from "@/lib/auth/roles";
import { getListingById } from "@/lib/marketplace/listings";
import { buildPayfastCheckout } from "@/lib/payfast/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  addressSchema,
  formatShippingAddress,
  type CheckoutStartInput,
} from "@/lib/checkout/address";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type { CheckoutStartInput };

export type CheckoutStartResult =
  | { ok: true; processUrl: string; fields: { name: string; value: string }[] }
  | { ok: false; error: string };

/**
 * Start a PayFast checkout: validate the buyer's delivery address, persist it
 * keyed by m_payment_id (so the ITN handler can attach it to the order PayFast's
 * hosted flow doesn't collect addresses), and return the signed redirect fields.
 *
 * Re-runs every authorization check (this is a fresh request, independent of the
 * page render) and uses the trusted service-role client only AFTER verifying the
 * caller owns the action.
 */
export async function startPayfastCheckoutAction(
  input: CheckoutStartInput,
): Promise<CheckoutStartResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to complete your purchase." };
  // BUY-1: only buyer-capable accounts may purchase.
  if (!roleCanAccess(user.role, "buyer")) {
    return { ok: false, error: "This account can't make purchases." };
  }
  // Suspended/banned accounts can't transact. /checkout isn't under the
  // middleware-gated /buyer area, so enforce account status here too.
  if (user.status !== "active") {
    return { ok: false, error: "Your account is not eligible to make purchases." };
  }

  // Light abuse guard: a handful of checkout starts per minute is plenty.
  if (!(await rateLimit(`checkout:${user.id}`, 15, 60))) {
    return { ok: false, error: "Too many attempts — please wait a moment and retry." };
  }

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid delivery details." };
  }
  const a = parsed.data;

  const listing = await getListingById(a.listingId);
  if (!listing) return { ok: false, error: "This piece is no longer available." };
  if (listing.seller_id === user.id) {
    return { ok: false, error: "You can't buy your own piece." };
  }
  if (listing.status !== "active") {
    return { ok: false, error: "This piece is no longer available." };
  }

  const db = createAdminClient();

  // ---- Accepted-offer pricing (validated server-side; never trust the client).
  // Default: full listing price, no offer link.
  let chargeCents = listing.price_cents;
  let offerId: string | undefined;
  if (a.offerId) {
    const { data: offer, error: offerErr } = await db
      .from("offers")
      .select(
        "id, listing_id, buyer_id, state, agreed_amount_cents, pay_deadline_at",
      )
      .eq("id", a.offerId)
      .maybeSingle();
    if (offerErr) {
      console.error("checkout: failed to load offer", offerErr);
      return { ok: false, error: "Could not start checkout. Please try again." };
    }
    // GUARD: only the offering buyer may pay the agreed price, only while the
    // offer is 'accepted' with a frozen agreed amount and an open pay window,
    // and only for THIS still-active listing. Any failure → no agreed-price path.
    const payWindowOpen =
      offer?.pay_deadline_at != null &&
      Date.now() <= new Date(offer.pay_deadline_at).getTime();
    if (
      !offer ||
      offer.buyer_id !== user.id ||
      offer.listing_id !== listing.id ||
      offer.state !== "accepted" ||
      offer.agreed_amount_cents == null ||
      !payWindowOpen
      // listing.status === 'active' already enforced above (someone else may
      // have bought it at full price; then the offer can no longer be paid).
    ) {
      return {
        ok: false,
        error: "This offer can no longer be paid at the agreed price.",
      };
    }
    chargeCents = offer.agreed_amount_cents;
    offerId = offer.id;
  }

  // Build the signed checkout FIRST so we persist the intent under the exact
  // m_payment_id that PayFast will echo back in the ITN. For an accepted offer
  // we charge the frozen agreed amount and bind the payment to the offer.
  const checkout = buildPayfastCheckout({
    listing,
    buyerEmail: user.email,
    buyerId: user.id,
    amountCentsOverride: chargeCents,
    offerId,
  });

  // The intent carries the frozen charged amount + offer link so fulfilment
  // (under the listing+offer row lock) records the order at the agreed price and
  // computes commission on it. offer_id/amount_cents (added to checkout_intents by
  // SCHEMA migration 20260617120010_offer_checkout.sql) are nullable: a full-price
  // checkout leaves offer_id null and behaves exactly as before.
  const intentRow: TablesInsert<"checkout_intents"> = {
    m_payment_id: checkout.mPaymentId,
    listing_id: listing.id,
    buyer_id: user.id,
    shipping_name: a.recipient,
    shipping_address: formatShippingAddress(a),
    offer_id: offerId ?? null,
    amount_cents: chargeCents,
  };
  const { error } = await db.from("checkout_intents").insert(intentRow);
  if (error) {
    console.error("checkout: failed to store delivery address", error);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }

  return { ok: true, processUrl: checkout.processUrl, fields: checkout.fields };
}
