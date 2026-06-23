"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ensureSellerProfile } from "@/lib/seller/profile";

export type SellerActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Edit listing price
// ---------------------------------------------------------------------------
export async function updateListingPriceAction(
  listingId: string,
  priceRands: number,
): Promise<SellerActionResult> {
  const user = await requireRole("seller");
  const parsed = z
    .number()
    .positive("Enter a valid price.")
    .max(100_000_000)
    .safeParse(priceRands);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid price." };
  }

  const supabase = await createClient();
  // Read the owner + current price in one go: confirm ownership AND capture the
  // pre-edit price so we can detect a genuine drop after the update.
  const { data: existing } = await supabase
    .from("listings")
    .select("seller_id, price_cents")
    .eq("id", listingId)
    .maybeSingle();
  if (!existing || existing.seller_id !== user.id) {
    return { ok: false, error: "Listing not found." };
  }
  const oldCents = existing.price_cents;
  const newCents = Math.round(parsed.data * 100);

  const { error } = await supabase
    .from("listings")
    .update({ price_cents: newCents })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not update the price." };

  // Price-drop alerts: notify buyers who saved this piece on a genuine decrease.
  // Dynamic import keeps the server-only notification module out of this action's
  // static graph (same pattern as approveSubmissionAction → notifyWishlistMatches).
  if (newCents < oldCents) {
    try {
      const { notifyPriceDrop } = await import("@/lib/notifications/price-drop");
      await notifyPriceDrop(listingId, oldCents, newCents);
    } catch (err) {
      console.error("price-drop notify failed", err);
    }
  }

  revalidatePath("/seller/listings");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delist / relist
// ---------------------------------------------------------------------------
export async function setListingStatusAction(
  listingId: string,
  status: "active" | "delisted",
): Promise<SellerActionResult> {
  const user = await requireRole("seller");
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.seller_id !== user.id) {
    return { ok: false, error: "Listing not found." };
  }
  // Can't change a sold listing.
  if (listing.status === "sold") {
    return { ok: false, error: "Sold pieces can't be changed." };
  }

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not update the listing." };

  revalidatePath("/seller/listings");
  revalidatePath("/browse");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Update profile + banking details
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  bankName: z.string().trim().max(120).optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().max(40).optional().or(z.literal("")),
  bankBranchCode: z.string().trim().max(20).optional().or(z.literal("")),
  bankAccountHolder: z.string().trim().max(120).optional().or(z.literal("")),
});

export type SellerProfileInput = z.infer<typeof profileSchema>;

export async function updateSellerProfileAction(
  input: SellerProfileInput,
): Promise<SellerActionResult> {
  const user = await requireRole("seller");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const supabase = await createClient();
  await ensureSellerProfile(supabase, user);

  const { error } = await supabase
    .from("seller_profiles")
    .update({
      display_name: d.displayName || null,
      bio: d.bio || null,
      bank_name: d.bankName || null,
      bank_account_number: d.bankAccountNumber || null,
      bank_branch_code: d.bankBranchCode || null,
      bank_account_holder: d.bankAccountHolder || null,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not save your profile." };

  revalidatePath("/seller/profile");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Select a subscription tier
// ---------------------------------------------------------------------------
export async function selectTierAction(
  tierId: string,
): Promise<SellerActionResult> {
  const user = await requireRole("seller");
  const supabase = await createClient();

  // Validate the tier exists and is active.
  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("id")
    .eq("id", tierId)
    .eq("active", true)
    .maybeSingle();
  if (!tier) return { ok: false, error: "That plan is unavailable." };

  // Cancel any current active subscriptions, then activate the new one.
  await supabase
    .from("seller_subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "active");

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { error } = await supabase.from("seller_subscriptions").insert({
    user_id: user.id,
    tier_id: tierId,
    status: "active",
    current_period_end: periodEnd.toISOString(),
  });
  if (error) return { ok: false, error: "Could not change your plan." };

  revalidatePath("/seller/subscription");
  return { ok: true };
}
