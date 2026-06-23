import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only read helpers for the notification centre (feature 4). These
 * hydrate the header bell dropdown and the full /notifications page.
 *
 * They live in a `server-only` data-reader module (NOT a `"use server"` actions
 * module) on purpose: a `"use server"` file marks EVERY export as a
 * network-callable Server Action, and putting RSC data readers there wraps them
 * as actions and corrupts the client/server action manifest — silently bailing
 * hydration page-wide (this project has been bitten by that twice). Mirrors
 * lib/marketplace/saved.ts / lib/buyer/queries.ts. The companion mutations live
 * in lib/notifications/actions.ts.
 *
 * Reads go through the plain RLS client: notifications carries an owner SELECT
 * policy ("owner or admin read"), so a normal client only ever sees the
 * caller's own rows. We still filter by user_id for an exact-key bound
 * (defence-in-depth, served by notifications_user_idx).
 */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const SELECT_COLS = "id, type, title, body, link, read, created_at";

/**
 * The most-recent notifications for the header bell dropdown, newest-first.
 * Empty array on any failure so the chrome never breaks.
 */
export async function getRecentNotifications(
  userId: string,
  limit = 8,
): Promise<NotificationItem[]> {
  if (!userId) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(SELECT_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as NotificationItem[];
  } catch {
    return [];
  }
}

/**
 * The number of unread notifications for the bell badge. Returns 0 on failure
 * so the badge simply doesn't show rather than crashing the header.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Every notification for the full /notifications centre page, newest-first.
 */
export async function getAllNotifications(
  userId: string,
): Promise<NotificationItem[]> {
  if (!userId) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(SELECT_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as NotificationItem[];
  } catch {
    return [];
  }
}
