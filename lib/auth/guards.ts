import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User, UserRole } from "@/lib/supabase/database.types";
import { ROLE_HOME, roleCanAccess } from "@/lib/auth/roles";

/**
 * The current user's full application record, or null if signed out.
 * Authoritative role comes from the users table.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (data) return data;

  // AUTH-2: authenticated session but no public.users row — the signup trigger
  // lagged/failed, a read replica is behind, or an auth user was created out of
  // band. Self-heal via the service-role client so the user isn't dead-ended
  // between the middleware gate (which defaults a missing profile to buyer) and
  // these guards (which would otherwise bounce them to /signin forever).
  return provisionUserRow(user.id, user.email ?? "", user.user_metadata?.role);
}

/**
 * Idempotently ensure a public.users row exists for an authenticated auth user.
 * Role is coerced to buyer/seller only — admin is never self-assignable (mirrors
 * the handle_new_user trigger).
 */
async function provisionUserRow(
  id: string,
  email: string,
  metadataRole: unknown,
): Promise<User | null> {
  const role: UserRole = metadataRole === "seller" ? "seller" : "buyer";
  const admin = createAdminClient();
  await admin
    .from("users")
    .upsert({ id, email, role }, { onConflict: "id", ignoreDuplicates: true });
  const { data } = await admin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Banned/suspended accounts are turned away (defense-in-depth vs middleware). */
function assertActive(user: User): void {
  if (user.status === "banned" || user.status === "suspended") {
    redirect("/signin?error=account_suspended");
  }
}

/** Require any signed-in, active user; redirect to /signin otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  assertActive(user); // AUTH-4: enforce status here too, not only in requireRole
  return user;
}

/**
 * Require a specific role (admin always passes). Redirects unauthenticated users
 * to /signin and wrong-role users to their own dashboard. Defense-in-depth
 * alongside the middleware gate.
 */
export async function requireRole(required: UserRole): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  assertActive(user);
  if (!roleCanAccess(user.role, required)) redirect(ROLE_HOME[user.role]);
  return user;
}
