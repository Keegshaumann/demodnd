"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * Notification-centre mutations (feature 4) — mark a single notification read,
 * or mark every unread one read.
 *
 * This module is `"use server"`, so EVERY export is a network-callable Server
 * Action — keep it to actions only. The RSC read helpers
 * (getRecentNotifications / getUnreadCount / getAllNotifications) live in the
 * `server-only` lib/notifications/queries.ts; mixing them in here would wrap
 * them as actions and corrupt the action manifest, silently breaking hydration
 * (this project has been bitten by that twice).
 *
 * Writes go through the plain RLS client: notifications carries an owner UPDATE
 * policy ("owner update", USING + WITH CHECK auth.uid() = user_id), so a normal
 * client can only ever flip its own rows. We still scope by user_id for an
 * exact-key bound (defence-in-depth).
 *
 * Guests: requireUser() redirects unauthenticated callers, so we catch its throw
 * and return the { ok:false, error:"signin" } sentinel instead — the client
 * islands route the visitor to /signin rather than 500ing.
 */
export type NotificationActionResult =
  | { ok: true }
  | { ok: false; error: string };

const idSchema = z.string().uuid();

/** Mark a single notification read (idempotent). */
export async function markNotificationReadAction(
  id: string,
): Promise<NotificationActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid notification." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", parsed.data)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not update that notification." };

  revalidatePath("/notifications");
  return { ok: true };
}

/** Mark all of the current user's unread notifications read. */
export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "signin" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return { ok: false, error: "Could not update your notifications." };

  revalidatePath("/notifications");
  return { ok: true };
}
