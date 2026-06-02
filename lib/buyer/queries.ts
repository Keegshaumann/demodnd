import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Notification, Wishlist } from "@/lib/supabase/database.types";

/** The current buyer's wishlist entries (RLS scopes to the owner). */
export async function getWishlists(buyerId: string): Promise<Wishlist[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Recent in-platform notifications (e.g. wishlist matches). RLS-scoped. */
export async function getNotifications(
  buyerId: string,
  limit = 6,
): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
