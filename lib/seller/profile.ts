import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SellerProfile, User } from "@/lib/supabase/database.types";

/** Slugify an email local-part into a username base. */
function usernameBase(email: string): string {
  const local = email.split("@")[0] ?? "seller";
  const cleaned = local.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "seller";
}

/**
 * Ensure the current seller has a `seller_profiles` row (needed for public
 * profiles, the reputation widget, and the admin payout ledger). Idempotent —
 * does nothing if one already exists. Username is derived from the email plus a
 * short uid suffix to avoid collisions on the unique index.
 *
 * Runs with the caller's RLS-bound client; the insert policy allows a user to
 * create their own profile (`user_id = auth.uid()`).
 */
export async function ensureSellerProfile(
  supabase: SupabaseClient<Database>,
  user: Pick<User, "id" | "email">,
): Promise<void> {
  const { data: existing } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return;

  const username = `${usernameBase(user.email)}-${user.id.slice(0, 6)}`;
  await supabase
    .from("seller_profiles")
    .insert({ user_id: user.id, username })
    // If a concurrent request created it, ignore the conflict.
    .select("id")
    .maybeSingle();
}

export async function getSellerProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SellerProfile | null> {
  const { data } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}
