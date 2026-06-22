"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * Buyer favourites ("saved pieces") — server actions for toggle/save/unsave.
 * A save is a single join row (saved_listings); writes are owner-scoped by RLS,
 * and we filter by buyer_id too (defence-in-depth, mirroring lib/buyer/actions.ts).
 *
 * This module is `"use server"`, so EVERY export is a network-callable Server
 * Action — keep it to actions only. The RSC saved-state read helpers
 * (getSavedListingIds / getSavedListings) live in the `server-only`
 * lib/marketplace/saved.ts; mixing them in here wrapped them as actions and
 * corrupted the action manifest, silently breaking hydration page-wide.
 *
 * Guests: requireUser() redirects unauthenticated callers, so we catch its throw
 * and return the { error: "signin" } sentinel instead — the FavouriteButton island
 * routes the visitor to /signin rather than 500ing.
 */
export type SavedActionResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

const listingIdSchema = z.string().uuid();

/**
 * Toggle the current buyer's saved state for a listing. Inserts when not saved,
 * deletes when already saved. Returns the resulting state so the optimistic
 * client island can reconcile.
 */
export async function toggleSavedAction(
  listingId: string,
): Promise<SavedActionResult> {
  // requireUser() redirects (throws) for guests — turn that into the signin
  // sentinel the client island understands, rather than letting it bubble.
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }

  const parsed = listingIdSchema.safeParse(listingId);
  if (!parsed.success) return { ok: false, error: "Invalid listing." };
  const id = parsed.data;

  const supabase = await createClient();

  // Is it already saved? (RLS scopes the read to this buyer; we add buyer_id for
  // an exact-key lookup against the composite PK.)
  const { data: existing, error: readErr } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("buyer_id", user.id)
    .eq("listing_id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: "Could not update your saved pieces." };

  if (existing) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("buyer_id", user.id)
      .eq("listing_id", id);
    if (error) return { ok: false, error: "Could not remove that piece." };
    revalidatePath("/buyer/wishlist");
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("saved_listings")
    .insert({ buyer_id: user.id, listing_id: id });
  if (error) return { ok: false, error: "Could not save that piece." };
  revalidatePath("/buyer/wishlist");
  return { ok: true, saved: true };
}

/**
 * Explicitly save a listing (idempotent). Kept alongside the toggle for callers
 * that want a directional action rather than a flip.
 */
export async function saveListingAction(
  listingId: string,
): Promise<SavedActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }
  const parsed = listingIdSchema.safeParse(listingId);
  if (!parsed.success) return { ok: false, error: "Invalid listing." };

  const supabase = await createClient();
  // onConflict no-op keeps a double-save from erroring on the composite PK.
  const { error } = await supabase
    .from("saved_listings")
    .upsert(
      { buyer_id: user.id, listing_id: parsed.data },
      { onConflict: "buyer_id,listing_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: "Could not save that piece." };
  revalidatePath("/buyer/wishlist");
  return { ok: true, saved: true };
}

/** Explicitly unsave a listing (idempotent). */
export async function unsaveListingAction(
  listingId: string,
): Promise<SavedActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }
  const parsed = listingIdSchema.safeParse(listingId);
  if (!parsed.success) return { ok: false, error: "Invalid listing." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("buyer_id", user.id)
    .eq("listing_id", parsed.data);
  if (error) return { ok: false, error: "Could not remove that piece." };
  revalidatePath("/buyer/wishlist");
  return { ok: true, saved: false };
}
