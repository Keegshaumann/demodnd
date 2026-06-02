"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_VALUES } from "@/lib/marketplace/constants";

export type WishlistActionResult = { ok: true } | { ok: false; error: string };

const wishlistSchema = z
  .object({
    brand: z.string().trim().max(120).optional().or(z.literal("")),
    category: z.string().trim().optional().or(z.literal("")),
    keywords: z.string().trim().max(300).optional().or(z.literal("")),
    maxPriceRands: z.number().positive().max(100_000_000).optional().nullable(),
  })
  .refine(
    (v) => !!(v.brand?.trim() || v.category?.trim() || v.keywords?.trim()),
    { message: "Add a brand, category, or keywords to match on." },
  );

export type WishlistInput = z.infer<typeof wishlistSchema>;

export async function addWishlistAction(
  input: WishlistInput,
): Promise<WishlistActionResult> {
  const user = await requireUser();
  const parsed = wishlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  // Validate category against the known set if provided.
  const category =
    d.category && (CATEGORY_VALUES as readonly string[]).includes(d.category)
      ? d.category
      : null;
  const brand = d.brand?.trim() || null;
  const keywords = d.keywords?.trim() || null;

  // Re-check the invariant against the *effective* values: an invalid category
  // coerces to null, which (with empty brand/keywords) would create an all-null
  // "match-everything" wishlist that spams the buyer on every approval.
  if (!brand && !category && !keywords) {
    return { ok: false, error: "Add a brand, category, or keywords to match on." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("wishlists").insert({
    buyer_id: user.id,
    brand,
    category,
    keywords,
    max_price_cents:
      typeof d.maxPriceRands === "number" && d.maxPriceRands > 0
        ? Math.round(d.maxPriceRands * 100)
        : null,
  });
  if (error) return { ok: false, error: "Could not save your wishlist entry." };

  revalidatePath("/buyer/wishlist");
  revalidatePath("/buyer");
  return { ok: true };
}

export async function removeWishlistAction(
  id: string,
): Promise<WishlistActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  // RLS already restricts deletes to the owner; we scope by buyer_id too.
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("id", id)
    .eq("buyer_id", user.id);
  if (error) return { ok: false, error: "Could not remove that entry." };

  revalidatePath("/buyer/wishlist");
  revalidatePath("/buyer");
  return { ok: true };
}
