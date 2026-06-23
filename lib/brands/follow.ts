"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { BRANDS } from "@/lib/marketplace/constants";

/**
 * Follow-a-designer — server actions for following/unfollowing a brand. A follow
 * is a single join row (followed_brands); writes are owner-scoped by RLS, and we
 * filter by buyer_id too (defence-in-depth, mirroring lib/buyer/saved.ts).
 *
 * This module is `"use server"`, so EVERY export is a network-callable Server
 * Action — keep it to actions only. The RSC follow-state read helpers
 * (getFollowedBrands / isFollowingBrand) live in the `server-only`
 * lib/brands/queries.ts; mixing them in here would wrap them as actions and
 * corrupt the action manifest, silently breaking hydration (confirmed twice
 * this project).
 *
 * Guests: requireUser() redirects unauthenticated callers, so we catch its throw
 * and return the { error: "signin" } sentinel instead — the FollowBrandButton
 * island routes the visitor to /signin rather than 500ing.
 */
export type FollowActionResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

// Constrain to the known maisons; an unknown brand has no designer page and no
// matching listings, so a free-form value is meaningless here.
const brandSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((b): b is (typeof BRANDS)[number] => (BRANDS as readonly string[]).includes(b), {
    message: "Unknown brand.",
  });

/**
 * Designer page path for a brand (revalidated so its Follow button re-syncs).
 * Slugifies inline (NFD diacritic-fold → hyphenate) to avoid a cross-lane
 * dependency on lib/brands/slug.ts; the canonical resolver lives there for
 * designer routing, but a path string for revalidatePath only needs to match.
 */
function designerPath(brand: string): string {
  const slug = brand
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `/designer/${slug}`;
}

/**
 * Toggle the current buyer's follow state for a brand. Inserts when not
 * following, deletes when already following. Returns the resulting state so the
 * optimistic client island can reconcile.
 */
export async function toggleFollowBrandAction(
  brand: string,
): Promise<FollowActionResult> {
  // requireUser() redirects (throws) for guests — turn that into the signin
  // sentinel the client island understands, rather than letting it bubble.
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }

  const parsed = brandSchema.safeParse(brand);
  if (!parsed.success) return { ok: false, error: "Invalid brand." };
  const value = parsed.data;

  const supabase = await createClient();

  // Already following? (RLS scopes the read to this buyer; we add buyer_id for
  // an exact-key lookup against the composite PK.)
  const { data: existing, error: readErr } = await supabase
    .from("followed_brands")
    .select("brand")
    .eq("buyer_id", user.id)
    .eq("brand", value)
    .maybeSingle();
  if (readErr) return { ok: false, error: "Could not update your follows." };

  if (existing) {
    const { error } = await supabase
      .from("followed_brands")
      .delete()
      .eq("buyer_id", user.id)
      .eq("brand", value);
    if (error) return { ok: false, error: "Could not unfollow that designer." };
    revalidatePath(designerPath(value));
    return { ok: true, following: false };
  }

  const { error } = await supabase
    .from("followed_brands")
    .insert({ buyer_id: user.id, brand: value });
  if (error) return { ok: false, error: "Could not follow that designer." };
  revalidatePath(designerPath(value));
  return { ok: true, following: true };
}

/**
 * Explicitly follow a brand (idempotent). Kept alongside the toggle for callers
 * that want a directional action rather than a flip.
 */
export async function followBrandAction(
  brand: string,
): Promise<FollowActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }
  const parsed = brandSchema.safeParse(brand);
  if (!parsed.success) return { ok: false, error: "Invalid brand." };

  const supabase = await createClient();
  // onConflict no-op keeps a double-follow from erroring on the composite PK.
  const { error } = await supabase
    .from("followed_brands")
    .upsert(
      { buyer_id: user.id, brand: parsed.data },
      { onConflict: "buyer_id,brand", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: "Could not follow that designer." };
  revalidatePath(designerPath(parsed.data));
  return { ok: true, following: true };
}

/** Explicitly unfollow a brand (idempotent). */
export async function unfollowBrandAction(
  brand: string,
): Promise<FollowActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }
  const parsed = brandSchema.safeParse(brand);
  if (!parsed.success) return { ok: false, error: "Invalid brand." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("followed_brands")
    .delete()
    .eq("buyer_id", user.id)
    .eq("brand", parsed.data);
  if (error) return { ok: false, error: "Could not unfollow that designer." };
  revalidatePath(designerPath(parsed.data));
  return { ok: true, following: false };
}
