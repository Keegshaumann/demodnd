"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { sendEmail, ADMIN_NOTIFICATION_EMAIL } from "@/lib/email/client";
import { cashOutRequestAdminEmail } from "@/lib/email/templates";

export type CashOutResult = { ok: true } | { ok: false; error: string };

const schema = z.object({ listingId: z.string().uuid() });

/**
 * A seller asks D&D to make them a cash offer to buy one of their pieces
 * outright. One-click: records the request and emails D&D — no money moves and
 * no order is created. D&D follows up from the /admin/cash-outs queue.
 *
 * Same auth model as raising a dispute: the row is inserted with the seller's
 * RLS-bound client, whose INSERT policy re-checks that the caller owns the
 * listing and it isn't sold; ownership is also re-checked here for clarity.
 */
export async function requestCashOutAction(input: {
  listingId: string;
}): Promise<CashOutResult> {
  const user = await requireRole("seller");

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { listingId } = parsed.data;

  if (!(await rateLimit(`cashout:${user.id}`, 20, 3600))) {
    return {
      ok: false,
      error: "Too many requests just now — please try again later.",
    };
  }

  const supabase = await createClient();

  // Ownership + eligibility with the seller's own RLS-bound client.
  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, brand, title, price_cents, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.seller_id !== user.id) {
    return { ok: false, error: "Listing not found." };
  }
  if (listing.status === "sold") {
    return { ok: false, error: "This piece has already sold." };
  }

  // Friendly pre-check for an existing open request; the partial unique index
  // (status='open') is the hard guarantee against a double-submit race.
  const { data: existing } = await supabase
    .from("cash_out_requests")
    .select("id")
    .eq("listing_id", listingId)
    .eq("status", "open")
    .limit(1);
  if (existing && existing.length > 0) {
    return {
      ok: false,
      error:
        "You've already requested a cash offer on this piece — D&D will be in touch.",
    };
  }

  // Insert with the SESSION client — the INSERT RLS policy re-validates
  // ownership and that the listing isn't sold at the database level.
  const { error: insertError } = await supabase
    .from("cash_out_requests")
    .insert({ listing_id: listingId, seller_id: user.id })
    .select("id")
    .single();
  if (insertError) {
    // A double-submit race (two tabs) can pass the pre-check twice, then trip
    // the partial unique index (one open request per listing). That's success,
    // not failure — an open request now exists and D&D was already notified by
    // the winning insert — so treat 23505 as the friendly "already requested".
    if (insertError.code === "23505") {
      return {
        ok: false,
        error:
          "You've already requested a cash offer on this piece — D&D will be in touch.",
      };
    }
    return { ok: false, error: "Could not send your request. Please try again." };
  }

  // Notify D&D (best-effort — an email hiccup must not fail the request).
  try {
    await sendEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `Cash-out request — ${listing.brand} ${listing.title}`,
      html: cashOutRequestAdminEmail({
        brand: listing.brand,
        title: listing.title,
        listPriceCents: listing.price_cents,
        sellerEmail: user.email,
        reviewUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/cash-outs`,
      }),
    });
  } catch (err) {
    console.error("cash-out: admin email failed", err);
  }

  revalidatePath("/seller/listings");
  return { ok: true };
}
