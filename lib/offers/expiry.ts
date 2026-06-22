/**
 * Pure date/floor helpers for structured offers, shared between the offer reader
 * (lib/offers/queries.ts), the 'use server' actions (lib/offers/actions.ts), the
 * PDP eligibility check, and the checkout guard.
 *
 * Kept OUT of the "use server" module on purpose: a Next server-action module may
 * only export async functions, so these synchronous helpers live here (same
 * precedent as lib/disputes/window.ts).
 */
import type { Offer } from "@/lib/supabase/database.types";

/** 48-hour response deadline for a pending/countered offer. */
export const OFFER_RESPONSE_WINDOW_HOURS = 48;

/** 24-hour window for the buyer to pay an accepted offer at the agreed price. */
export const OFFER_PAY_WINDOW_HOURS = 24;

/** The 70% floor: an offer must be at least this fraction of the list price. */
export const OFFER_FLOOR_RATIO = 0.7;

const HOUR_MS = 3_600_000;

/** States a buyer can still act on — these occupy the one-open-offer slot. */
export const OPEN_OFFER_STATES = ["pending", "countered", "accepted"] as const;

/** When a pending/countered offer created/countered at `fromIso` stops accepting actions. */
export function offerExpiresAt(fromIso: string): Date {
  return new Date(new Date(fromIso).getTime() + OFFER_RESPONSE_WINDOW_HOURS * HOUR_MS);
}

/** When the buyer's pay window closes for an offer accepted at `acceptedIso`. */
export function payWindowEndsAt(acceptedIso: string): Date {
  return new Date(new Date(acceptedIso).getTime() + OFFER_PAY_WINDOW_HOURS * HOUR_MS);
}

/**
 * Minimum acceptable offer amount (integer cents): ceil(price * 0.70). Whole
 * rands in, whole cents out — rounding UP keeps the floor a true lower bound.
 */
export function offerFloorCents(priceCents: number): number {
  return Math.ceil(priceCents * OFFER_FLOOR_RATIO);
}

/**
 * A pending/countered offer whose 48h response deadline has passed is treated as
 * expired in reads and blocks further actions (the DB sweep later flips its
 * state so the unique-index slot frees up).
 */
export function isExpired(
  offer: Pick<Offer, "state" | "expires_at">,
  now: Date = new Date(),
): boolean {
  if (offer.state !== "pending" && offer.state !== "countered") return false;
  return now.getTime() > new Date(offer.expires_at).getTime();
}

/**
 * An accepted offer is payable at the agreed price only while its 24h pay window
 * is still open. An accepted offer past pay_deadline_at is "expired (unpaid)" and
 * not payable.
 */
export function isPayWindowOpen(
  offer: Pick<Offer, "state" | "pay_deadline_at">,
  now: Date = new Date(),
): boolean {
  if (offer.state !== "accepted" || !offer.pay_deadline_at) return false;
  return now.getTime() <= new Date(offer.pay_deadline_at).getTime();
}
