/**
 * Card merchandising badges — tiny pure helpers (no 'use server', no React).
 *
 * Drives the "Just listed" / "Trending" pills on {@link ListingCard}. Both are
 * derived client/server-agnostically from data the card already has (or is
 * passed as optional props), so this stays a zero-dependency leaf module that
 * any lane can import. The card never shows BOTH at once — Trending wins.
 */

/** Days a piece is considered "just listed" after creation. */
const JUST_LISTED_DAYS = 7;

/** Save/view thresholds at which a piece reads as "trending". Tuned so a brand
 *  with healthy interest qualifies while a fresh listing with 1–2 saves does
 *  not (the same >=3 floor the social-proof gate uses). */
const TRENDING_MIN_SAVES = 3;
const TRENDING_MIN_VIEWS = 25;

/**
 * True when `createdAt` (an ISO timestamp) is within the last
 * {@link JUST_LISTED_DAYS} days. Defensive against an unparseable/blank value —
 * returns false rather than throwing so a bad row never breaks a card.
 */
export function isJustListed(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  const ageMs = Date.now() - created;
  if (ageMs < 0) return false; // clock skew / future-dated — not "just listed"
  return ageMs <= JUST_LISTED_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * True when a piece reads as "trending" from its social counts — either enough
 * saves OR enough views. Missing counts default to 0 (not trending).
 */
export function isTrending({
  saveCount,
  viewCount,
}: {
  saveCount?: number;
  viewCount?: number;
}): boolean {
  return (saveCount ?? 0) >= TRENDING_MIN_SAVES || (viewCount ?? 0) >= TRENDING_MIN_VIEWS;
}
