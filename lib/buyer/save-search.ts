"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_VALUES } from "@/lib/marketplace/constants";

/**
 * "Save this search" — persist the buyer's current browse filter set as a
 * sourcing alert (a row in the existing `wishlists` table) so they're emailed
 * when a matching authenticated piece is listed. This deliberately reuses the
 * wishlist alert path rather than introducing a parallel store; it lives in its
 * own module (not lib/buyer/actions.ts) so the browse lane ships it without
 * touching that file.
 *
 * LOSSY MAPPING — `wishlists` only supports a single brand/category/keywords/
 * max_price triple, while browse filters are multi-select. We collapse:
 *   • brand    → the first selected brand; any others are folded into keywords.
 *   • category → the first selected category (validated against the known set);
 *                others are dropped (a wishlist matches one category at a time).
 *   • keywords → the free-text query plus any spilled-over extra brands.
 *   • max_price_cents ← the `max` price filter (the `min` filter has no wishlist
 *                analogue and is dropped).
 * The buyer can refine the saved alert afterwards from /buyer/wishlist.
 *
 * Guests: requireUser() redirects (throws) for unauthenticated callers; we catch
 * it and return the { error: "signin" } sentinel so the client island routes the
 * visitor to /signin instead of surfacing a 500.
 */
export type SaveSearchResult =
  | { ok: true }
  | { ok: false; error: string };

/** The filter set the browse page captures from the live URL. */
const saveSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  brands: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  maxCents: z.number().int().positive().max(10_000_000_000).optional().nullable(),
});

export type SaveSearchInput = z.infer<typeof saveSearchSchema>;

export async function saveSearchAction(
  input: SaveSearchInput,
): Promise<SaveSearchResult> {
  // Turn requireUser()'s guest redirect into the signin sentinel the island
  // understands, rather than letting it bubble.
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }

  const parsed = saveSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Could not read your current filters." };
  }
  const d = parsed.data;

  const brands = d.brands ?? [];
  const categories = d.categories ?? [];

  // First selected brand drives the alert; spill the rest into keywords so the
  // multi-brand intent isn't silently lost.
  const brand = brands[0] ?? null;
  const extraBrands = brands.slice(1);

  // Validate the first category against the known set; an unknown value coerces
  // to null so we never create a match-everything alert.
  const firstCategory = categories[0];
  const category =
    firstCategory && (CATEGORY_VALUES as readonly string[]).includes(firstCategory)
      ? firstCategory
      : null;

  // Keywords = the search term plus any extra brands (so the alert still matches
  // them on listing), folded into one space-joined string.
  const keywordParts = [d.q?.trim(), ...extraBrands].filter(
    (s): s is string => !!s && s.length > 0,
  );
  const keywords = keywordParts.length ? keywordParts.join(" ").slice(0, 300) : null;

  // A wishlist with no brand/category/keywords matches everything and would spam
  // the buyer on every approval — reject it (mirrors lib/buyer/actions.ts).
  if (!brand && !category && !keywords) {
    return {
      ok: false,
      error: "Add a search term, brand, or category before saving this search.",
    };
  }

  const supabase = await createClient();

  // Skip an exact duplicate so repeated taps don't pile up identical alerts.
  // Nullable text columns need `.is(col, null)` rather than `.eq(col, null)`.
  let dupeQuery = supabase
    .from("wishlists")
    .select("id")
    .eq("buyer_id", user.id);
  dupeQuery =
    brand === null ? dupeQuery.is("brand", null) : dupeQuery.eq("brand", brand);
  dupeQuery =
    category === null
      ? dupeQuery.is("category", null)
      : dupeQuery.eq("category", category);
  dupeQuery =
    keywords === null
      ? dupeQuery.is("keywords", null)
      : dupeQuery.eq("keywords", keywords);
  const { data: dupe } = await dupeQuery.maybeSingle();
  if (dupe) {
    revalidatePath("/buyer/wishlist");
    return { ok: true };
  }

  const { error } = await supabase.from("wishlists").insert({
    buyer_id: user.id,
    brand,
    category,
    keywords,
    max_price_cents:
      typeof d.maxCents === "number" && d.maxCents > 0 ? d.maxCents : null,
  });
  if (error) return { ok: false, error: "Could not save this search." };

  revalidatePath("/buyer/wishlist");
  revalidatePath("/buyer");
  return { ok: true };
}
