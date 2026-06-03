"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminOrderActionResult = { ok: true } | { ok: false; error: string };

function revalidate(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** paid → delivered. */
export async function markOrderDeliveredAction(
  orderId: string,
): Promise<AdminOrderActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "paid") {
    return { ok: false, error: "Only paid orders can be marked delivered." };
  }
  const { error } = await db
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { ok: false, error: "Could not update the order." };
  revalidate(orderId);
  return { ok: true };
}

/** paid|delivered → disputed (flag only; a public dispute row is separate). */
export async function flagOrderDisputedAction(
  orderId: string,
): Promise<AdminOrderActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "paid" && order.status !== "delivered") {
    return {
      ok: false,
      error: "Only paid or delivered orders can be flagged disputed.",
    };
  }
  const { error } = await db
    .from("orders")
    .update({ status: "disputed" })
    .eq("id", orderId);
  if (error) return { ok: false, error: "Could not update the order." };
  revalidate(orderId);
  return { ok: true };
}

/**
 * Record that an order was refunded (status only). STRIPE DEFERRED: this does
 * NOT move money — process the actual refund against the PaymentIntent in
 * Stripe; this just keeps the ledger status accurate.
 */
export async function recordOrderRefundedAction(
  orderId: string,
): Promise<AdminOrderActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (
    order.status !== "paid" &&
    order.status !== "delivered" &&
    order.status !== "disputed"
  ) {
    return { ok: false, error: "This order can't be marked refunded." };
  }
  const { error } = await db
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId);
  if (error) return { ok: false, error: "Could not update the order." };
  revalidate(orderId);
  return { ok: true };
}
