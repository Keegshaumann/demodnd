"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User, UserRole, UserStatus } from "@/lib/supabase/database.types";

export type AdminUserActionResult = { ok: true } | { ok: false; error: string };

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  username: string | null;
  verified: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Search users by email, name, seller username, or exact user id. Admin-only;
 * uses the service-role client. Empty query returns the most recent users.
 */
export async function searchUsers(query: string): Promise<AdminUserRow[]> {
  await requireRole("admin");
  const db = createAdminClient();
  const q = query.trim();

  let baseUsers: User[] = [];

  if (!q) {
    const { data } = await db
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    baseUsers = data ?? [];
  } else {
    const s = q.replace(/[,()*%]/g, "");
    const ids = new Set<string>();
    if (UUID_RE.test(q)) ids.add(q);

    const { data: profs } = await db
      .from("seller_profiles")
      .select("user_id")
      .ilike("username", `%${s}%`)
      .limit(50);
    (profs ?? []).forEach((p) => ids.add(p.user_id));

    const [{ data: byText }, byIdRes] = await Promise.all([
      db
        .from("users")
        .select("*")
        .or(`email.ilike.%${s}%,full_name.ilike.%${s}%`)
        .limit(50),
      ids.size
        ? db.from("users").select("*").in("id", [...ids])
        : Promise.resolve({ data: [] }),
    ]);

    const merged = new Map<string, User>();
    [...(byText ?? []), ...(byIdRes.data ?? [])].forEach((u) =>
      merged.set(u.id, u),
    );
    baseUsers = [...merged.values()];
  }

  const userIds = baseUsers.map((u) => u.id);
  const profiles = userIds.length
    ? (
        await db
          .from("seller_profiles")
          .select("user_id, username, verified")
          .in("user_id", userIds)
      ).data ?? []
    : [];
  const profByUser = new Map(profiles.map((p) => [p.user_id, p]));

  return baseUsers.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
    username: profByUser.get(u.id)?.username ?? null,
    verified: profByUser.get(u.id)?.verified ?? false,
  }));
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export async function setUserStatusAction(
  userId: string,
  status: UserStatus,
): Promise<AdminUserActionResult> {
  const admin = await requireRole("admin");
  if (userId === admin.id) {
    return { ok: false, error: "You can't change your own account status." };
  }
  const db = createAdminClient();
  // ADM-4: admins can't suspend/ban each other.
  const { data: target } = await db
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (target?.role === "admin") {
    return { ok: false, error: "You can't change another admin's account." };
  }
  const { error } = await db.from("users").update({ status }).eq("id", userId);
  if (error) return { ok: false, error: "Could not update the account." };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Verify or un-verify a seller's identity (gates their ability to list). */
export async function setSellerVerifiedAction(
  userId: string,
  verified: boolean,
): Promise<AdminUserActionResult> {
  await requireRole("admin");
  const db = createAdminClient();

  // ADM-2: only seller accounts have an identity to verify. Refuse to fabricate
  // a seller_profiles row for a buyer (it would create an orphan profile + claim
  // a username while granting no access, since the seller gate reads users.role).
  const { data: targetUser } = await db
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (targetUser?.role === "buyer") {
    return { ok: false, error: "Only seller accounts can be ID-verified." };
  }

  const { data: existing } = await db
    .from("seller_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("seller_profiles")
      .update({ verified })
      .eq("user_id", userId);
    if (error) return { ok: false, error: "Could not update verification." };
  } else {
    const { data: u } = await db
      .from("users")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const local = (u?.email?.split("@")[0] ?? "seller")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const username = `${local || "seller"}-${userId.slice(0, 6)}`;
    const { error } = await db
      .from("seller_profiles")
      .insert({ user_id: userId, username, verified });
    if (error) return { ok: false, error: "Could not update verification." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/** Permanently delete an account (auth user → cascades public.users). */
export async function deleteUserAction(
  userId: string,
): Promise<AdminUserActionResult> {
  const admin = await requireRole("admin");
  if (userId === admin.id) {
    return { ok: false, error: "You can't delete your own account." };
  }
  const db = createAdminClient();
  // ADM-4: admins can't delete each other.
  const { data: target } = await db
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (target?.role === "admin") {
    return { ok: false, error: "You can't delete another admin's account." };
  }
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "Could not delete the account." };
  revalidatePath("/admin/users");
  return { ok: true };
}
