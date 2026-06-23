"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import {
  submissionApprovedSellerEmail,
  submissionMoreInfoSellerEmail,
  submissionDeclinedSellerEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AdminDb = SupabaseClient<Database>;
export type ActionResult = { ok: true } | { ok: false; error: string };

const DEFAULT_FEE_BPS = 1200; // Free tier fallback (12%)

/**
 * The fee rate (basis points) to lock onto a new listing: the seller's active
 * subscription tier, else the Free tier, else 12%.
 */
async function resolveSellerFeeBps(db: AdminDb, sellerId: string): Promise<number> {
  const { data: sub } = await db
    .from("seller_subscriptions")
    .select("tier_id")
    .eq("user_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sub?.tier_id) {
    const { data: tier } = await db
      .from("subscription_tiers")
      .select("transaction_fee_bps")
      .eq("id", sub.tier_id)
      .maybeSingle();
    if (typeof tier?.transaction_fee_bps === "number") {
      return tier.transaction_fee_bps;
    }
  }

  const { data: free } = await db
    .from("subscription_tiers")
    .select("transaction_fee_bps")
    .eq("name", "Free")
    .maybeSingle();
  return free?.transaction_fee_bps ?? DEFAULT_FEE_BPS;
}

async function sellerEmail(db: AdminDb, sellerId: string): Promise<string | null> {
  const { data } = await db
    .from("users")
    .select("email")
    .eq("id", sellerId)
    .maybeSingle();
  return data?.email ?? null;
}

// ---------------------------------------------------------------------------
// Approve → create an active listing + copy photos into listing_images
// ---------------------------------------------------------------------------
export async function approveSubmissionAction(
  submissionId: string,
): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const db = createAdminClient();

  const { data: sub } = await db
    .from("auth_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Submission not found." };
  // ADM-3: only pending / more_info submissions are approvable — never resurrect
  // a declined one (or re-approve an approved one).
  if (sub.status === "approved") {
    return { ok: false, error: "This submission is already approved." };
  }
  if (sub.status === "declined") {
    return { ok: false, error: "This submission was declined and can't be approved." };
  }

  // ADM-1: atomically CLAIM the submission before creating anything. The
  // conditional update only succeeds for the single caller that flips it out of
  // pending/more_info, so concurrent or repeated approvals can't each create a
  // listing (+ duplicate seller emails and wishlist-match spam). The partial
  // unique index on listings(auth_submission_id) is the final DB backstop.
  const { data: claimed, error: claimError } = await db
    .from("auth_submissions")
    .update({
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .in("status", ["pending", "more_info"])
    .select("id");
  if (claimError) {
    return { ok: false, error: "Could not approve the submission." };
  }
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "This submission was already actioned." };
  }

  const feeBps = await resolveSellerFeeBps(db, sub.seller_id);

  const { data: listing, error } = await db
    .from("listings")
    .insert({
      seller_id: sub.seller_id,
      auth_submission_id: sub.id,
      title: sub.title,
      brand: sub.brand,
      category: sub.category,
      model: sub.model,
      description: sub.description,
      condition: sub.condition,
      price_cents: sub.asking_price_cents,
      retail_price_cents: sub.retail_price_cents,
      year: sub.year,
      status: "active",
      fee_rate_bps: feeBps,
      auth_method: sub.method,
    })
    .select("id")
    .single();

  if (error || !listing) {
    // Roll the claim back so the submission can be retried.
    await db
      .from("auth_submissions")
      .update({
        status: sub.status,
        reviewed_by: sub.reviewed_by,
        reviewed_at: sub.reviewed_at,
      })
      .eq("id", sub.id);
    return { ok: false, error: "Could not create the listing." };
  }

  if (sub.photo_paths.length > 0) {
    const imageRows = sub.photo_paths.map((path, i) => ({
      listing_id: listing.id,
      url: db.storage.from("item-photos").getPublicUrl(path).data.publicUrl,
      sort_order: i,
    }));
    await db.from("listing_images").insert(imageRows);
  }

  const email = await sellerEmail(db, sub.seller_id);
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `Your piece is live — ${sub.brand} ${sub.title}`,
        html: submissionApprovedSellerEmail({
          title: `${sub.brand} ${sub.title}`,
          listingUrl: `${env.NEXT_PUBLIC_SITE_URL}/listing/${listing.id}`,
        }),
      });
    } catch (err) {
      console.error("approve: seller email failed", err);
    }
  }

  // Wishlist matching is triggered here in Step 12.
  try {
    const { notifyWishlistMatches } = await import("@/lib/wishlist/match");
    await notifyWishlistMatches(listing.id);
  } catch (err) {
    console.error("approve: wishlist match failed", err);
  }

  // Brand-follow fan-out: notify buyers who follow this brand that a new piece
  // by it just went live. Independent of the wishlist fan-out above — a failure
  // in one must not block the other.
  try {
    const { notifyBrandFollowers } = await import("@/lib/notifications/brand-follow");
    await notifyBrandFollowers(listing.id);
  } catch (err) {
    console.error("approve: brand-follow notify failed", err);
  }

  revalidatePath("/admin/submissions");
  // The piece is now live — refresh the public surfaces that list it.
  revalidatePath("/browse");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Request more info
// ---------------------------------------------------------------------------
const notesSchema = z.string().trim().min(1, "Add a note for the seller.").max(2000);

export async function requestMoreInfoAction(
  submissionId: string,
  notes: string,
): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const parsed = notesSchema.safeParse(notes);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }
  const db = createAdminClient();

  const { data: sub } = await db
    .from("auth_submissions")
    .select("id, seller_id, brand, title, status")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Submission not found." };
  // ADM-3: only pending / more_info submissions can be moved. Never re-open an
  // approved submission (its listing is already live) or a declined one.
  if (sub.status === "approved") {
    return { ok: false, error: "This submission is already approved and live." };
  }
  if (sub.status === "declined") {
    return { ok: false, error: "This submission was already declined." };
  }

  // Status-guarded update: surfaces DB errors and only proceeds (email seller,
  // return ok) when a row was genuinely transitioned out of pending/more_info —
  // never reports success or emails the seller on a silent write failure.
  const { data: updated, error: updateError } = await db
    .from("auth_submissions")
    .update({
      status: "more_info",
      admin_notes: parsed.data,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .in("status", ["pending", "more_info"])
    .select("id");
  if (updateError) {
    return { ok: false, error: "Could not update the submission." };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This submission was already actioned." };
  }

  const email = await sellerEmail(db, sub.seller_id);
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `More information needed — ${sub.brand} ${sub.title}`,
        html: submissionMoreInfoSellerEmail({
          title: `${sub.brand} ${sub.title}`,
          notes: parsed.data,
          portalUrl: `${env.NEXT_PUBLIC_SITE_URL}/seller`,
        }),
      });
    } catch (err) {
      console.error("more-info: seller email failed", err);
    }
  }

  revalidatePath("/admin/submissions");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Decline
// ---------------------------------------------------------------------------
export async function declineSubmissionAction(
  submissionId: string,
  notes: string,
): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const db = createAdminClient();

  const cleanNotes = notes.trim().slice(0, 2000);

  const { data: sub } = await db
    .from("auth_submissions")
    .select("id, seller_id, brand, title, status")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Submission not found." };
  // ADM-3: only pending / more_info submissions can be declined. Never decline
  // an approved submission (its listing is already live) or re-decline one.
  if (sub.status === "approved") {
    return { ok: false, error: "This submission is already approved and live." };
  }
  if (sub.status === "declined") {
    return { ok: false, error: "This submission was already declined." };
  }

  // Status-guarded update: surfaces DB errors and only proceeds (email seller,
  // return ok) when a row was genuinely transitioned out of pending/more_info.
  const { data: updated, error: updateError } = await db
    .from("auth_submissions")
    .update({
      status: "declined",
      admin_notes: cleanNotes || null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .in("status", ["pending", "more_info"])
    .select("id");
  if (updateError) {
    return { ok: false, error: "Could not decline the submission." };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This submission was already actioned." };
  }

  const email = await sellerEmail(db, sub.seller_id);
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `Submission outcome — ${sub.brand} ${sub.title}`,
        html: submissionDeclinedSellerEmail({
          title: `${sub.brand} ${sub.title}`,
          notes: cleanNotes,
        }),
      });
    } catch (err) {
      console.error("decline: seller email failed", err);
    }
  }

  revalidatePath("/admin/submissions");
  return { ok: true };
}
