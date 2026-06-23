import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCardData, type ListingCardData } from "@/lib/marketplace/listings";
import type { Listing } from "@/lib/supabase/database.types";

/**
 * Server-only read helpers backing the social-proof + discovery surfaces:
 *  - getSaveCounts  → save counts per listing (feature 7) + Trending input (8)
 *  - getRecentlySold → recently-sold rail/ticker (feature 6)
 *  - getListingsByIds → recently-viewed rail (feature 9)
 *
 * These live in a `server-only` data-reader module (NOT a `"use server"` file).
 * A `"use server"` file marks every export as a network-callable Server Action;
 * RSC data readers there corrupt the action manifest and silently break
 * hydration page-wide (confirmed twice this project). Mirrors
 * lib/marketplace/listings.ts / lib/marketplace/saved.ts.
 */

/** Cover image (lowest sort_order) per listing id — mirrors the browse grid join. */
async function coverImages(
  listingIds: string[],
): Promise<Map<string, string>> {
  const cover = new Map<string, string>();
  if (listingIds.length === 0) return cover;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_images")
    .select("listing_id, url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });
  (data ?? []).forEach((img) => {
    if (!cover.has(img.listing_id)) cover.set(img.listing_id, img.url);
  });
  return cover;
}

/**
 * Save count per listing id (number of buyers who saved it). saved_listings has
 * owner-only SELECT RLS, so a normal/anon client can only see the caller's own
 * saves — to count saves GLOBALLY we must use the service-role client (same
 * justification as notifyWishlistMatches reading cross-buyer data; the resulting
 * count is public social proof, not anyone's private save list). Aggregated in
 * JS rather than via SQL group-by since the generated client has no typed
 * aggregate helper. Ids with zero saves are simply absent from the map (callers
 * default to 0).
 */
export async function getSaveCounts(
  listingIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (listingIds.length === 0) return counts;

  const db = createAdminClient();
  const { data, error } = await db
    .from("saved_listings")
    .select("listing_id")
    .in("listing_id", listingIds);
  if (error || !data) return counts;

  for (const row of data) {
    counts.set(row.listing_id, (counts.get(row.listing_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Recently-sold pieces (status='sold', newest first) for the homepage / browse
 * "Recently sold" rail. Mapped through the same toCardData + cover-image join as
 * the grid; the card already carries the "Sold" treatment off the status field.
 * Returns [] on any error so a secondary rail never takes a page down.
 */
export async function getRecentlySold(limit = 8): Promise<ListingCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "sold")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error || !data || data.length === 0) return [];

  const rows = data as Listing[];
  const cover = await coverImages(rows.map((l) => l.id));
  return rows.map((l) => toCardData(l, cover));
}

/**
 * Listings for a caller-supplied list of ids (recently-viewed rail), preserving
 * the caller's order. Only active/sold pieces are returned (a delisted/pending
 * id silently drops out — RLS + this explicit status filter agree). Dedupes ids
 * defensively. Returns [] for an empty/whitespace id list.
 */
export async function getListingsByIds(
  ids: string[],
): Promise<ListingCardData[]> {
  const orderedIds = [...new Set(ids)].filter(Boolean);
  if (orderedIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .in("id", orderedIds)
    .in("status", ["active", "sold"]);
  if (error || !data || data.length === 0) return [];

  // `.in()` doesn't preserve the caller's order — re-sort to the recently-viewed
  // (most-recent-first) order the caller passed.
  const byId = new Map<string, Listing>(
    (data as Listing[]).map((l) => [l.id, l]),
  );
  const rows = orderedIds
    .map((id) => byId.get(id))
    .filter((l): l is Listing => l != null);
  if (rows.length === 0) return [];

  const cover = await coverImages(rows.map((l) => l.id));
  return rows.map((l) => toCardData(l, cover));
}
