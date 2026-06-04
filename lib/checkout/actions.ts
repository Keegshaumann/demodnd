"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { roleCanAccess } from "@/lib/auth/roles";
import { getListingById } from "@/lib/marketplace/listings";
import { buildPayfastCheckout } from "@/lib/payfast/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { SA_PROVINCES } from "@/lib/marketplace/constants";

const addressSchema = z.object({
  listingId: z.string().uuid(),
  recipient: z.string().trim().min(2, "Enter the recipient's full name.").max(120),
  line1: z.string().trim().min(3, "Enter a street address.").max(160),
  line2: z.string().trim().max(160).optional().default(""),
  suburb: z.string().trim().min(2, "Enter a suburb.").max(80),
  city: z.string().trim().min(2, "Enter a city/town.").max(80),
  province: z.enum(SA_PROVINCES),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter a valid 4-digit postal code."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid contact number."),
});

export type CheckoutStartInput = z.input<typeof addressSchema>;

export type CheckoutStartResult =
  | { ok: true; processUrl: string; fields: { name: string; value: string }[] }
  | { ok: false; error: string };

/** Compose the validated parts into the single text address stored on the order. */
function formatShippingAddress(a: {
  line1: string;
  line2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
}): string {
  const street = [a.line1, a.line2].filter(Boolean).join(", ");
  return [
    street,
    a.suburb,
    `${a.city}, ${a.province} ${a.postalCode}`,
    `Tel: ${a.phone}`,
  ]
    .filter(Boolean)
    .join("\n");
}

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

  // Build the signed checkout FIRST so we persist the intent under the exact
  // m_payment_id that PayFast will echo back in the ITN.
  const checkout = buildPayfastCheckout({
    listing,
    buyerEmail: user.email,
    buyerId: user.id,
  });

  const db = createAdminClient();
  const { error } = await db.from("checkout_intents").insert({
    m_payment_id: checkout.mPaymentId,
    listing_id: listing.id,
    buyer_id: user.id,
    shipping_name: a.recipient,
    shipping_address: formatShippingAddress(a),
  });
  if (error) {
    console.error("checkout: failed to store delivery address", error);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }

  return { ok: true, processUrl: checkout.processUrl, fields: checkout.fields };
}
