import type { Wishlist } from "@/lib/supabase/database.types";

/**
 * Pure wishlist-matching logic, separated from the IO in match.ts so it can be
 * unit-tested without the service-role client / email layer.
 */

/** The listing fields needed to decide a wishlist match. */
export interface MatchableListing {
  brand: string;
  category: string;
  title: string;
  model: string | null;
  description: string | null;
  price_cents: number;
}

/** Lowercase + strip diacritics so "Hermes" matches "Hermès" (BUY-5). */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Does a wishlist match this listing? brand/category/keywords/price all narrow. */
export function wishlistMatches(w: Wishlist, listing: MatchableListing): boolean {
  // A wishlist with no brand/category/keywords would match everything — never
  // alert on it (defends against any all-null row slipping past validation).
  if (!w.brand && !w.category && !w.keywords) return false;
  if (w.brand && fold(w.brand) !== fold(listing.brand)) {
    return false;
  }
  if (w.category && w.category !== listing.category) return false;
  if (w.max_price_cents != null && listing.price_cents > w.max_price_cents) {
    return false;
  }
  if (w.keywords) {
    // Include `model` — the browse search matches on it and the form invites
    // model-style keywords ("Birkin 30"), so the wishlist alert must too (BUY-2).
    const haystack = fold(
      `${listing.title} ${listing.brand} ${listing.model ?? ""} ${listing.description ?? ""}`,
    );
    const tokens = fold(w.keywords).split(/\s+/).filter(Boolean);
    // Every keyword token must appear (precise — luxury buyers don't want spam).
    if (!tokens.every((t) => haystack.includes(t))) return false;
  }
  return true;
}
