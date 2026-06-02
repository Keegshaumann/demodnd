import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Stripe server client — STANDARD account (NOT Connect).
 *
 * D&D Luxury is the merchant of record: buyers are charged and funds land in
 * D&D's own Stripe balance. There is no Connect, no escrow, no transfers, and
 * no automated payouts here — D&D pays sellers via offline EFT. The `orders`
 * table records the sale and the reference payout amount only.
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
  appInfo: {
    name: "D&D Luxury Marketplace",
  },
});
