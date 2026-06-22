import "server-only";
import { randomUUID } from "node:crypto";
import { payfast } from "./config";
import { payfastSignature } from "./signature";
import { env } from "@/lib/env";
import type { Listing } from "@/lib/supabase/database.types";

export interface PayfastCheckout {
  /** URL the form POSTs to (PayFast payment engine). */
  processUrl: string;
  /** Ordered hidden form fields, signature included — render in this order. */
  fields: { name: string; value: string }[];
  /** Our unique reference for this attempt (stored as orders.gateway_reference). */
  mPaymentId: string;
}

/**
 * Build a signed PayFast checkout (hosted-redirect / "Custom" flow). The buyer's
 * browser POSTs `fields` to `processUrl`; PayFast charges the FULL amount to D&D
 * (no split — sellers are paid by manual EFT). listing id + buyer id ride along
 * in custom_str1/2 so the ITN can fulfil the order server-side.
 *
 * Accepted-offer path (additive, zero regression for full-price checkouts):
 *  - `amountCentsOverride` charges the AGREED offer amount instead of the listing
 *    price. When omitted, the listing price is used exactly as before.
 *  - `offerId` rides along in custom_str4 so the ITN can bind the payment to the
 *    offer and re-validate the agreed price under a row lock during fulfilment.
 *    For full-price checkouts custom_str4 is blank, and `payfastSignature`
 *    excludes blank values, so the full-price signature is byte-identical to
 *    today — no signature regression.
 */
export function buildPayfastCheckout(args: {
  listing: Pick<Listing, "id" | "brand" | "title" | "price_cents" | "seller_id">;
  buyerEmail: string;
  buyerId: string;
  /** Override the charged amount (integer ZAR cents). Defaults to listing.price_cents. */
  amountCentsOverride?: number;
  /** Accepted-offer id; rides in custom_str4 so the ITN can bind the payment to it. */
  offerId?: string;
}): PayfastCheckout {
  const { listing, buyerEmail, buyerId, amountCentsOverride, offerId } = args;
  const mPaymentId = randomUUID();
  // Charge the agreed offer amount when provided, else the listing price.
  const chargeCents = amountCentsOverride ?? listing.price_cents;
  const amount = (chargeCents / 100).toFixed(2); // Rand, 2 decimals
  const site = env.NEXT_PUBLIC_SITE_URL;
  const isOffer = offerId != null && offerId !== "";

  // ORDER IS LOAD-BEARING — PayFast's documented field order; the signature and
  // the rendered form must use exactly this order. custom_str4 is appended after
  // custom_str3 (unused-after, so safe); blank for full-price checkouts.
  const ordered: [string, string][] = [
    ["merchant_id", payfast.merchantId],
    ["merchant_key", payfast.merchantKey],
    ["return_url", `${site}/checkout/success?ref=${mPaymentId}`],
    ["cancel_url", `${site}/listing/${listing.id}`],
    ["notify_url", `${site}/api/payfast/itn`],
    ["email_address", buyerEmail],
    ["m_payment_id", mPaymentId],
    ["amount", amount],
    ["item_name", `${listing.brand} ${listing.title}`.slice(0, 100)],
    [
      "item_description",
      `Authenticated ${listing.brand} — D&D Luxury${isOffer ? " (agreed offer)" : ""}`.slice(
        0,
        255,
      ),
    ],
    ["custom_str1", listing.id],
    ["custom_str2", buyerId],
    ["custom_str3", listing.seller_id],
    ["custom_str4", isOffer ? offerId : ""],
  ];

  const signature = payfastSignature(ordered, payfast.passphrase);
  const fields = [
    ...ordered.map(([name, value]) => ({ name, value })),
    { name: "signature", value: signature },
  ];

  return { processUrl: payfast.processUrl, fields, mPaymentId };
}
