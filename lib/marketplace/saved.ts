import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toCardData, type ListingCardData } from "@/lib/marketplace/listings";
import type { Listing } from "@/lib/supabase/database.types";

/**
 * Server-only read helpers for buyer favourites ("saved pieces"). These hydrate
 * saved-state across the listing surfaces and the wishlist "Saved pieces" tab.
 *
 * They live in a `server-only` data-reader module (NOT the `"use server"`
 * actions module lib/buyer/saved.ts) on purpose: a `"use server"` file marks
 * every export as a network-callable Server Action. Putting these RSC data
 * readers there wrapped them as actions and corrupted the client/server action
 * manifest relative to the client chunk graph, which silently bailed hydration
 * page-wide. Mirrors lib/marketplace/listings.ts / lib/buyer/queries.ts.
 */

/**
 * The set of listing ids the buyer has saved, for hydrating saved-state across
 * the card surfaces in a single cheap query. Returns an empty set for guests
 * (buyerId === null) so callers can pass `user?.id ?? null` unconditionally.
 */
export async function getSavedListingIds(
  buyerId: string | null,
): Promise<Set<string>> {
  if (!buyerId) return new Set();
  const supabase = await createClient();
  // RLS already restricts the read to this buyer; the explicit filter is an
  // exact-key bound and keeps intent obvious.
  const { data } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("buyer_id", buyerId);
  return new Set((data ?? []).map((r) => r.listing_id));
}

/**
 * The buyer's saved pieces as ListingCardData (newest-saved first), reusing the
 * same toCardData mapping + cover-image join as the browse grid. Returns []
 * for guests. Used by the buyer wishlist "Saved pieces" tab.
 */
export async function getSavedListings(
  buyerId: string | null,
): Promise<ListingCardData[]> {
  if (!buyerId) return [];
  const supabase = await createClient();

  // Two-step rather than an embedded join: the generated saved_listings type
  // carries no FK relationship metadata, so an embedded listings(*) select
  // doesn't typecheck. Fetch the saved ids newest-first (served by
  // saved_listings_buyer_idx), then the listings themselves.
  const { data: saved, error } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) return [];

  const orderedIds = (saved ?? []).map((r) => r.listing_id);
  if (orderedIds.length === 0) return [];

  // The listings SELECT policy governs visibility (a delisted piece simply
  // won't come back). Re-sort to the saved-at order since `.in()` doesn't
  // preserve it.
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .in("id", orderedIds);
  const byId = new Map<string, Listing>(
    (listings ?? []).map((l) => [l.id, l]),
  );
  const rows = orderedIds
    .map((id) => byId.get(id))
    .filter((l): l is Listing => l != null);
  if (rows.length === 0) return [];

  // Cover image per listing (lowest sort_order), mirroring the grid's join.
  const cover = new Map<string, string>();
  const { data: images } = await supabase
    .from("listing_images")
    .select("listing_id, url, sort_order")
    .in(
      "listing_id",
      rows.map((l) => l.id),
    )
    .order("sort_order", { ascending: true });
  (images ?? []).forEach((img) => {
    if (!cover.has(img.listing_id)) cover.set(img.listing_id, img.url);
  });

  return rows.map((l) => toCardData(l, cover));
}
