"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { sendEmail, ADMIN_NOTIFICATION_EMAIL } from "@/lib/email/client";
import { disputeRaisedAdminEmail } from "@/lib/email/templates";
import { disputeWindowEndsAt } from "@/lib/disputes/window";

export type RaiseDisputeResult = { ok: true } | { ok: false; error: string };

const raiseDisputeSchema = z.object({
  orderId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Please describe the issue (at least 10 characters).")
    .max(2000, "Please keep your description under 2000 characters."),
});

/**
 * Buyer raises a dispute on a delivered order within the 48-hour window.
 *
 * The dispute row is inserted with the buyer's RLS-bound client (the
 * "order party can raise" policy enforces raiser + ownership at the DB), then
 * the delivered→disputed status flip uses the admin client because the orders
 * UPDATE RLS policy is admin-only by design (writes are server-side — same
 * precedent as confirmReceiptAction).
 *
 * No in-app notification is created: the buyer is the actor (nothing to tell
 * them), notifications has no INSERT grant for authenticated, and admins are
 * notified via ADMIN_NOTIFICATION_EMAIL plus the /admin/disputes queue.
 */
export async function raiseDisputeAction(input: {
  orderId: string;
  reason: string;
}): Promise<RaiseDisputeResult> {
  const user = await requireUser();

  const parsed = raiseDisputeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { orderId, reason } = parsed.data;

  // Ownership check with the user's RLS-bound client (they can only read their
  // own orders; buyer_id is re-checked explicitly for defense-in-depth).
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, status, delivered_at, listing_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) {
    return { ok: false, error: "Order not found." };
  }
  if (order.status === "disputed") {
    return { ok: false, error: "A dispute is already open on this order." };
  }
  if (order.status !== "delivered") {
    return { ok: false, error: "Disputes can only be raised on delivered orders." };
  }
  if (
    !order.delivered_at ||
    Date.now() > disputeWindowEndsAt(order.delivered_at).getTime()
  ) {
    return {
      ok: false,
      error:
        "The 48-hour dispute window for this order has closed. Please contact our concierge and we'll still help.",
    };
  }

  const db = createAdminClient();

  // Existing-open-dispute guard — the admin client is required here because the
  // session client can't see a seller-raised dispute on this order. Best-effort
  // pre-check: a sub-second double-submit race could produce a duplicate row,
  // which is harmless (admin sees both in the queue, no money moves).
  const { data: existing } = await db
    .from("disputes")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "open")
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, error: "A dispute is already open on this order." };
  }

  // Insert with the SESSION client — the disputes INSERT RLS policy enforces
  // that the raiser is an order party at the database level.
  const { error: insertError } = await supabase
    .from("disputes")
    .insert({ order_id: orderId, raised_by: user.id, reason })
    .select("id")
    .single();
  if (insertError) {
    return { ok: false, error: "Could not raise the dispute. Please try again." };
  }

  // Flip the order delivered→disputed with the admin client (orders UPDATE is
  // admin-only by design). Conditional on status='delivered' so concurrent
  // raises stay idempotent. If this fails the dispute row already exists and
  // /admin/disputes is the source of truth — do not fail the action.
  const { error: flipError } = await db
    .from("orders")
    .update({ status: "disputed" })
    .eq("id", orderId)
    .eq("status", "delivered")
    .select("id");
  if (flipError) {
    console.error("Failed to flag order as disputed:", flipError);
  }

  // Notify D&D admin. Email failure must not fail the dispute.
  try {
    // Sold listings aren't publicly readable, so fetch item context with the
    // admin client (same reason as getOrderForBuyer).
    const { data: listing } = await db
      .from("listings")
      .select("brand, title")
      .eq("id", order.listing_id)
      .maybeSingle();
    const brand = listing?.brand ?? "—";
    const title = listing?.title ?? "Item";
    await sendEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `New dispute — ${brand} ${title}`,
      html: disputeRaisedAdminEmail({
        orderShortId: orderId.slice(0, 8).toUpperCase(),
        brand,
        title,
        buyerEmail: user.email,
        reason,
        reviewUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/disputes`,
      }),
    });
  } catch (err) {
    console.error("Failed to send admin dispute email:", err);
  }

  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath("/buyer/orders");
  revalidatePath("/buyer");
  return { ok: true };
}
