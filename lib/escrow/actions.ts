"use server";

import { getCurrentUser } from "@/lib/auth/guards";
import { roleCanAccess } from "@/lib/auth/roles";
import { getListingById } from "@/lib/marketplace/listings";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { randomUUID } from "node:crypto";
import {
  addressSchema,
  formatShippingAddress,
  structuredAddressColumns,
  type CheckoutStartInput,
} from "@/lib/checkout/address";
import { getEscrowProvider } from "@/lib/escrow/client";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type { CheckoutStartInput };

export type EscrowCheckoutResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string };

/**
 * Start an escrow checkout (ESCROW-COURIER-SPEC.md §7.2) — the escrow equivalent
 * of `startPayfastCheckoutAction`. Validates the buyer's delivery address,
 * computes the amount, creates the provider escrow transaction, persists a
 * checkout intent (structured address + offer link + courier quote), and returns
 * the provider pay URL.
 *
 * SCAFFOLD (Phase 1): NOT wired to any UI yet (that swap is Phase 2), and the
 * provider `createTransaction` call is a stub that throws until Phase 2 binds the
 * real API. Guarded exactly like the PayFast checkout action (auth + role +
 * status + rateLimit) before spending. The courier quote (Part B) folds into
 * `amountCents` in Phase 4; here shipping is 0.
 */
export async function startEscrowCheckoutAction(
  input: CheckoutStartInput,
): Promise<EscrowCheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to complete your purchase." };
  if (!roleCanAccess(user.role, "buyer")) {
    return { ok: false, error: "This account can't make purchases." };
  }
  if (user.status !== "active") {
    return { ok: false, error: "Your account is not eligible to make purchases." };
  }

  if (!(await rateLimit(`escrow-checkout:${user.id}`, 15, 60))) {
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
  let itemCents = listing.price_cents;
  let offerId: string | undefined;
  if (a.offerId) {
    const { data: offer, error: offerErr } = await db
      .from("offers")
      .select("id, listing_id, buyer_id, state, agreed_amount_cents, pay_deadline_at")
      .eq("id", a.offerId)
      .maybeSingle();
    if (offerErr) {
      console.error("escrow checkout: failed to load offer", offerErr);
      return { ok: false, error: "Could not start checkout. Please try again." };
    }
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
    ) {
      return {
        ok: false,
        error: "This offer can no longer be paid at the agreed price.",
      };
    }
    itemCents = offer.agreed_amount_cents;
    offerId = offer.id;
  }

  // TODO(phase-4 courier): quote the hub->buyer courier cost (getRates) and fold
  // it into shippingCents; here it is 0, so amountCents == itemCents.
  const shippingCents = 0;
  const amountCents = itemCents + shippingCents;

  // Our unique reference for this attempt (the checkout_intents PK), passed to
  // the provider as orderRef so the webhook can map back to the intent.
  const orderRef = randomUUID();

  let escrowId: string;
  let payUrl: string | undefined;
  try {
    const result = await getEscrowProvider().createTransaction({
      orderRef,
      amountCents,
      currency: "ZAR",
      buyer: { email: user.email, name: a.recipient },
      // TODO(escrow-provider): map the seller's banking (seller_profiles) to the
      // provider's payout representation once the provider API is bound.
      seller: { id: listing.seller_id, payout: {} },
      itemDescription: `${listing.brand} ${listing.title}`,
    });
    escrowId = result.escrowId;
    payUrl = result.payUrl;
  } catch (err) {
    console.error("escrow checkout: createTransaction failed", err);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
  void escrowId; // persisted onto the order at fulfilment (resolved via orderRef)

  // Persist the intent: structured address (§6.1) + flattened blob for display,
  // the accepted-offer link + frozen item amount, and the courier quote (0/null
  // in Phase 1). Mirrors the PayFast intent; keyed by orderRef.
  const intentRow: TablesInsert<"checkout_intents"> = {
    m_payment_id: orderRef,
    listing_id: listing.id,
    buyer_id: user.id,
    shipping_name: a.recipient,
    shipping_address: formatShippingAddress(a),
    ...structuredAddressColumns(a),
    offer_id: offerId ?? null,
    amount_cents: itemCents,
    pp_quoteno: null,
    shipping_amount_cents: shippingCents,
  };
  const { error } = await db.from("checkout_intents").insert(intentRow);
  if (error) {
    console.error("escrow checkout: failed to store intent", error);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }

  if (!payUrl) {
    // A provider that hosts no redirect (embedded pay) returns no payUrl; that
    // path is bound in Phase 2. For the redirect providers we expect a payUrl.
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
  return { ok: true, payUrl };
}
