import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { splitCommission } from "@/lib/money";
import { sendEmail } from "@/lib/email/client";
import {
  purchaseConfirmationBuyerEmail,
  saleNotificationSellerEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import type { Listing } from "@/lib/supabase/database.types";

/**
 * Create a PaymentIntent for a listing purchase. STANDARD account — the charge
 * lands in D&D's own Stripe balance (no Connect, no transfers). A fresh intent
 * is created per checkout load; abandoned intents simply expire.
 *
 * `payment_method_types` is intentionally omitted so Stripe serves dynamic
 * payment methods (configured in the Dashboard).
 */
export async function createListingPaymentIntent(args: {
  listing: Pick<Listing, "id" | "brand" | "title" | "price_cents" | "seller_id" | "fee_rate_bps">;
  buyerId: string;
}): Promise<{ clientSecret: string; amountCents: number }> {
  const { listing, buyerId } = args;
  const pi = await stripe.paymentIntents.create({
    amount: listing.price_cents,
    currency: "zar",
    automatic_payment_methods: { enabled: true },
    description: `${listing.brand} ${listing.title}`,
    metadata: {
      listing_id: listing.id,
      buyer_id: buyerId,
      seller_id: listing.seller_id,
    },
  });

  if (!pi.client_secret) {
    throw new Error("Stripe did not return a client secret.");
  }
  return { clientSecret: pi.client_secret, amountCents: listing.price_cents };
}

function formatShipping(pi: Stripe.PaymentIntent): {
  name: string | null;
  address: string | null;
} {
  const shipping = pi.shipping;
  if (!shipping) return { name: null, address: null };
  const a = shipping.address;
  const address = a
    ? [a.line1, a.line2, a.city, a.state, a.postal_code, a.country]
        .filter(Boolean)
        .join(", ")
    : null;
  return { name: shipping.name ?? null, address };
}

/**
 * Fulfill a succeeded PaymentIntent: create the order (with the listing's LOCKED
 * fee rate), mark the listing sold, and email buyer + seller. Idempotent — the
 * unique constraint on orders.stripe_payment_intent_id prevents duplicates, and
 * we early-return if an order already exists.
 */
export async function fulfillPaymentIntent(
  pi: Stripe.PaymentIntent,
): Promise<void> {
  const db = createAdminClient();

  // Idempotency: already fulfilled?
  const { data: existing } = await db
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();
  if (existing) return;

  const listingId = pi.metadata.listing_id;
  const buyerId = pi.metadata.buyer_id;
  if (!listingId || !buyerId) {
    console.error("fulfill: PaymentIntent missing metadata", pi.id);
    return;
  }

  const { data: listing } = await db
    .from("listings")
    .select("id, seller_id, brand, title, fee_rate_bps")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) {
    console.error("fulfill: listing not found", listingId);
    return;
  }

  // Atomically claim the listing: only one PaymentIntent can flip it
  // active -> sold. If it is already sold, two buyers checked out the same
  // one-of-a-kind piece — refund this charge (D&D is merchant of record) and
  // stop, so we never record a second order or owe a second payout.
  const { data: claimed } = await db
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listing.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (!claimed) {
    console.error("fulfill: listing already sold — refunding double sale", pi.id, listing.id);
    try {
      await stripe.refunds.create({ payment_intent: pi.id });
    } catch (err) {
      console.error("fulfill: refund of double sale failed", pi.id, err);
    }
    return;
  }

  const grossCents = pi.amount_received || pi.amount;
  const { commissionCents, sellerPayoutCents } = splitCommission(
    grossCents,
    listing.fee_rate_bps,
  );
  const shipping = formatShipping(pi);

  const { error: orderError } = await db.from("orders").insert({
    buyer_id: buyerId,
    listing_id: listing.id,
    seller_id: listing.seller_id,
    stripe_payment_intent_id: pi.id,
    gross_amount_cents: grossCents,
    commission_amount_cents: commissionCents,
    seller_payout_amount_cents: sellerPayoutCents,
    fee_rate_bps: listing.fee_rate_bps,
    status: "paid",
    shipping_name: shipping.name,
    shipping_address: shipping.address,
    paid_at: new Date().toISOString(),
  });

  if (orderError) {
    // A concurrent delivery already created the order (PI-id or
    // one-order-per-listing unique index). Safe no-op.
    if (orderError.code === "23505" || orderError.message.includes("duplicate")) {
      return;
    }
    console.error("fulfill: order insert failed after listing claim", pi.id, orderError);
    return;
  }

  // Emails (best-effort).
  const { data: buyer } = await db
    .from("users")
    .select("email")
    .eq("id", buyerId)
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
          grossAmountCents: grossCents,
          orderUrl: `${env.NEXT_PUBLIC_SITE_URL}/buyer`,
        }),
      });
    } catch (err) {
      console.error("fulfill: buyer email failed", err);
    }
  }

  if (seller?.email) {
    try {
      await sendEmail({
        to: seller.email,
        subject: `Your piece sold — ${listing.brand} ${listing.title}`,
        html: saleNotificationSellerEmail({
          title: `${listing.brand} ${listing.title}`,
          grossAmountCents: grossCents,
          sellerPayoutCents,
          dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/seller`,
        }),
      });
    } catch (err) {
      console.error("fulfill: seller email failed", err);
    }
  }
}
