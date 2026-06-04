import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { splitCommission } from "@/lib/money";
import { sendEmail } from "@/lib/email/client";
import {
  purchaseConfirmationBuyerEmail,
  saleNotificationSellerEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";

/** The ITN fields fulfilment needs (already validated by the route handler). */
export interface PayfastItn {
  m_payment_id: string;
  pf_payment_id: string;
  merchant_id: string;
  payment_status: string;
  amount_gross: string;
  custom_str1?: string; // listing_id
  custom_str2?: string; // buyer_id
  custom_str3?: string; // seller_id
  name_first?: string;
  name_last?: string;
  [key: string]: string | undefined;
}

/**
 * Fulfil a COMPLETE PayFast payment: create the order (with the listing's LOCKED
 * fee rate), mark the listing sold, and email buyer + seller.
 *
 * The idempotency check, anti-tamper amount check, active->sold claim, and order
 * insert run ATOMICALLY in `fulfill_payfast_order` (one DB transaction). On a
 * transient DB error nothing is committed and we re-raise so the route returns
 * 5xx and PayFast retries — there is no "sold but no order" half-state.
 */
export async function fulfillPayfastPayment(itn: PayfastItn): Promise<void> {
  const db = createAdminClient();
  const reference = itn.m_payment_id; // our unique idempotency key

  const listingId = itn.custom_str1;
  const buyerId = itn.custom_str2;
  if (!listingId || !buyerId) {
    console.error("payfast fulfil: ITN missing custom_str1/2", reference);
    return;
  }

  const { data: listing } = await db
    .from("listings")
    .select("id, seller_id, brand, title, price_cents, fee_rate_bps")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) {
    console.error("payfast fulfil: listing not found", listingId);
    return;
  }

  const grossCents = Math.round(parseFloat(itn.amount_gross) * 100);
  const { commissionCents, sellerPayoutCents } = splitCommission(
    grossCents,
    listing.fee_rate_bps,
  );

  // Delivery address captured in-app at checkout (PayFast doesn't collect one),
  // keyed by m_payment_id. Fall back to the PayFast payer name if it's missing.
  const { data: intent } = await db
    .from("checkout_intents")
    .select("shipping_name, shipping_address")
    .eq("m_payment_id", reference)
    .maybeSingle();
  const payerName =
    [itn.name_first, itn.name_last].filter(Boolean).join(" ") || null;

  // Atomic: idempotency + amount check + active->sold claim + order insert.
  const { data: outcome, error: rpcError } = await db.rpc(
    "fulfill_payfast_order",
    {
      p_gateway_reference: reference,
      p_listing_id: listing.id,
      p_buyer_id: buyerId,
      p_gross_cents: grossCents,
      p_commission_cents: commissionCents,
      p_payout_cents: sellerPayoutCents,
      p_fee_rate_bps: listing.fee_rate_bps,
      p_shipping_name: intent?.shipping_name ?? payerName,
      p_shipping_address: intent?.shipping_address ?? null,
    },
  );

  if (rpcError) {
    // Transient/unexpected DB error — nothing committed (atomic). Re-raise so the
    // route returns 5xx and PayFast retries.
    console.error("payfast fulfil: rpc error", reference, rpcError);
    throw new Error(`fulfill_payfast_order failed: ${rpcError.message}`);
  }

  switch (outcome) {
    case "created":
      break; // proceed to notify + clean up
    case "duplicate":
      return; // already fulfilled — idempotent no-op
    case "already_sold":
      // One-of-a-kind concurrent purchase. PayFast refunds go through the
      // separate api.payfast.co.za API — flag loudly for a MANUAL refund rather
      // than record a second sale.
      console.error(
        `payfast fulfil: listing already sold — MANUAL REFUND REQUIRED for pf_payment_id=${itn.pf_payment_id} (m_payment_id=${reference}), listing=${listing.id}`,
      );
      return;
    case "amount_mismatch":
      console.error(
        "payfast fulfil: amount mismatch — refusing",
        reference,
        grossCents,
        listing.price_cents,
      );
      return;
    case "listing_missing":
      console.error(
        "payfast fulfil: listing vanished mid-fulfil",
        reference,
        listing.id,
      );
      return;
    default:
      console.error("payfast fulfil: unexpected outcome", reference, outcome);
      return;
  }

  // Address is now on the order — drop the transient intent (best-effort).
  await db.from("checkout_intents").delete().eq("m_payment_id", reference);

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
      console.error("payfast fulfil: buyer email failed", err);
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
      console.error("payfast fulfil: seller email failed", err);
    }
  }
}
