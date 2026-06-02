import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User, UserRole } from "@/lib/supabase/database.types";
import { ROLE_HOME, roleCanAccess } from "@/lib/auth/roles";

/**
 * The current user's full application record, or null if signed out / not yet
 * provisioned. Authoritative role comes from the users table.
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

  return data ?? null;
}

/** Require any signed-in user; redirect to /signin otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
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
  if (user.status === "banned" || user.status === "suspended") {
    redirect("/signin?error=account_suspended");
  }
  if (!roleCanAccess(user.role, required)) redirect(ROLE_HOME[user.role]);
  return user;
}
