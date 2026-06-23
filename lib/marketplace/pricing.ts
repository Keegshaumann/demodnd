/**
 * Pure pricing helpers for the retail / resale-value anchor.
 *
 * No "use server" / "server-only" — these are pure synchronous functions safe
 * to import from both server and client components (cards, PDP, admin rows).
 */

export interface RetailDiscount {
  /** The original-retail (MSRP) anchor in ZAR cents, struck through in the UI. */
  retailCents: number;
  /** Whole-percent discount vs the asking price, rounded. e.g. `42` → "42% below retail". */
  pct: number;
}

/**
 * Resolve the retail anchor for a listing.
 *
 * Returns `null` (render nothing extra — just the asking price) unless
 * `retailCents` is a positive number strictly GREATER than `askingCents`.
 * When it is, returns the retail anchor plus the rounded discount percentage
 * `round((retail - asking) / retail * 100)`.
 */
export function retailDiscount(
  askingCents: number,
  retailCents: number | null | undefined,
): RetailDiscount | null {
  if (typeof retailCents !== "number" || retailCents <= 0) return null;
  if (retailCents <= askingCents) return null;
  return {
    retailCents,
    pct: Math.round(((retailCents - askingCents) / retailCents) * 100),
  };
}
