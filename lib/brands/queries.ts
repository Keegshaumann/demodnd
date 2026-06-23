import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only read helpers for follow-a-designer state. These hydrate the
 * FollowBrandButton's initial state on designer pages / PDP / brand filters.
 *
 * They live in a `server-only` data-reader module (NOT the `"use server"`
 * actions module lib/brands/follow.ts) on purpose: a `"use server"` file marks
 * every export as a network-callable Server Action. Putting these RSC data
 * readers there would wrap them as actions and corrupt the client/server action
 * manifest, silently bailing hydration page-wide. Mirrors lib/marketplace/saved.ts.
 */

/**
 * The set of brands the buyer follows, for hydrating follow-state across several
 * brand surfaces in one cheap query. Returns an empty set for guests
 * (buyerId === null) so callers can pass `user?.id ?? null` unconditionally.
 */
export async function getFollowedBrands(
  buyerId: string | null,
): Promise<Set<string>> {
  if (!buyerId) return new Set();
  const supabase = await createClient();
  // RLS already restricts the read to this buyer; the explicit filter is an
  // exact-key bound and keeps intent obvious.
  const { data } = await supabase
    .from("followed_brands")
    .select("brand")
    .eq("buyer_id", buyerId);
  return new Set((data ?? []).map((r) => r.brand));
}

/**
 * Whether the buyer follows a single brand — hydrates the PDP / designer-page
 * FollowBrandButton without fetching the whole follow set. Returns false for
 * guests (buyerId === null).
 */
export async function isFollowingBrand(
  buyerId: string | null,
  brand: string,
): Promise<boolean> {
  if (!buyerId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("followed_brands")
    .select("brand")
    .eq("buyer_id", buyerId)
    .eq("brand", brand)
    .maybeSingle();
  return data != null;
}
