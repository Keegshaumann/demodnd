import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Dispute } from "@/lib/supabase/database.types";

/**
 * The most recent dispute the current user raised on an order, or null.
 *
 * Uses the session client deliberately: the disputes SELECT RLS policy scopes
 * results to disputes the caller raised (or admin), so a seller-raised dispute
 * stays invisible here and the buyer order page falls back to a generic
 * "in dispute" message keyed off the order status.
 */
export async function getDisputeForOrder(orderId: string): Promise<Dispute | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
