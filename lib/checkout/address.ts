import { z } from "zod";
import { SA_PROVINCES } from "@/lib/marketplace/constants";

/**
 * The buyer's delivery address, captured in-app at checkout and Zod-validated.
 *
 * Lives in its own module (not the `"use server"` action files) so BOTH the
 * PayFast checkout action and the new escrow checkout action share ONE address
 * contract — a `"use server"` module may only export async functions, so a
 * schema/const cannot be exported from there. See ESCROW-COURIER-SPEC.md §6.1
 * ("reuse addressSchema") and §7.2.
 */
export const addressSchema = z.object({
  listingId: z.string().uuid(),
  // Pay for an accepted offer at the agreed price (optional). When present, the
  // checkout is bound to the offer and the charged amount is the agreed amount —
  // validated server-side by the action and again, under a row lock, in fulfilment.
  offerId: z.string().uuid().optional(),
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
export type ParsedAddress = z.infer<typeof addressSchema>;

/** Compose the validated parts into the single text address stored on the order. */
export function formatShippingAddress(a: {
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
 * Map a parsed address to the DISCRETE ship_* columns (ESCROW-COURIER-SPEC.md
 * §6.1) added to `checkout_intents` / `orders` in Phase 0. The courier "to"
 * address and the escrow record read these instead of parsing the flattened
 * blob. Persist BOTH the discrete fields and the blob (via
 * {@link formatShippingAddress}) for backward compatibility + display.
 */
export function structuredAddressColumns(a: ParsedAddress): {
  ship_recipient: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_suburb: string;
  ship_city: string;
  ship_province: string;
  ship_postal_code: string;
  ship_phone: string;
} {
  return {
    ship_recipient: a.recipient,
    ship_line1: a.line1,
    ship_line2: a.line2 ? a.line2 : null,
    ship_suburb: a.suburb,
    ship_city: a.city,
    ship_province: a.province,
    ship_postal_code: a.postalCode,
    ship_phone: a.phone,
  };
}
