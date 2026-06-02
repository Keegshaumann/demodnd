/**
 * Money helpers. All amounts are integer ZAR cents — never floats.
 */

/**
 * Format integer ZAR cents as a Rand string. The en-ZA locale uses a
 * (non-breaking) space group separator and comma decimal, e.g.
 * 28500000 -> "R 285 000", and with decimals -> "R 285 000,50".
 */
export function formatZar(
  cents: number,
  opts: { withDecimals?: boolean } = {},
): string {
  // Guard against NaN/Infinity ever reaching the UI as "R NaN".
  if (!Number.isFinite(cents)) return "R 0";
  const rands = cents / 100;
  const formatter = new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: opts.withDecimals ? 2 : 0,
    maximumFractionDigits: opts.withDecimals ? 2 : 0,
  });
  return `R ${formatter.format(rands)}`;
}

/** Convert a Rand amount (number, e.g. from a form) to integer cents. */
export function randsToCents(rands: number): number {
  return Math.round(rands * 100);
}

/**
 * Split a gross sale (integer cents) into commission and seller payout using a
 * locked fee rate in basis points (bps). 1200 bps = 12%.
 *
 * Commission is rounded to the nearest cent; the seller payout is the exact
 * remainder so the two always sum back to gross with no rounding leak.
 */
export function splitCommission(
  grossCents: number,
  feeRateBps: number,
): { commissionCents: number; sellerPayoutCents: number } {
  const commissionCents = Math.round((grossCents * feeRateBps) / 10000);
  const sellerPayoutCents = grossCents - commissionCents;
  return { commissionCents, sellerPayoutCents };
}

/** Format basis points as a percentage label, e.g. 1200 -> "12%". */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
