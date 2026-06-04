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
 */
export function buildPayfastCheckout(args: {
  listing: Pick<Listing, "id" | "brand" | "title" | "price_cents" | "seller_id">;
  buyerEmail: string;
  buyerId: string;
}): PayfastCheckout {
  const { listing, buyerEmail, buyerId } = args;
  const mPaymentId = randomUUID();
  const amount = (listing.price_cents / 100).toFixed(2); // Rand, 2 decimals
  const site = env.NEXT_PUBLIC_SITE_URL;

  // ORDER IS LOAD-BEARING — PayFast's documented field order; the signature and
  // the rendered form must use exactly this order.
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
    ["item_description", `Authenticated ${listing.brand} — D&D Luxury`.slice(0, 255)],
    ["custom_str1", listing.id],
    ["custom_str2", buyerId],
    ["custom_str3", listing.seller_id],
  ];

  const signature = payfastSignature(ordered, payfast.passphrase);
  const fields = [
    ...ordered.map(([name, value]) => ({ name, value })),
    { name: "signature", value: signature },
  ];

  return { processUrl: payfast.processUrl, fields, mPaymentId };
}
