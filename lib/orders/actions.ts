"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderActionResult = { ok: true } | { ok: false; error: string };

/**
 * Buyer confirms receipt of a delivered piece → status becomes `delivered`.
 * Ownership is verified with the user's RLS-bound client (they can only read
 * their own order), then the update is applied with the admin client because
 * the orders UPDATE RLS policy is admin-only by design (writes are server-side).
 */
export async function confirmReceiptAction(
  orderId: string,
): Promise<OrderActionResult> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) {
    return { ok: false, error: "Order not found." };
  }
  if (order.status !== "paid") {
    return { ok: false, error: "This order can't be confirmed." };
  }

  const db = createAdminClient();
  // Conditional on status='paid' so a refunded/disputed order can never be
  // flipped back to delivered, and concurrent confirms stay idempotent.
  const { data: updated, error } = await db
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id");

  if (error) {
    return { ok: false, error: "Could not update the order. Please try again." };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This order can't be confirmed." };
  }

  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath("/buyer");
  return { ok: true };
}
