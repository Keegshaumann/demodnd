import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NavUser } from "@/components/marketplace/SiteHeader";
import type { UserRole } from "@/lib/supabase/database.types";

/**
 * Lightweight current-user lookup for nav/chrome. Returns null when signed out
 * or if anything is not yet provisioned (e.g. before the DB exists), so public
 * pages always render.
 */
export async function getNavUser(): Promise<NavUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    const role: UserRole =
      (profile?.role as UserRole | undefined) ??
      (user.user_metadata?.role as UserRole | undefined) ??
      "buyer";

    return { role, email: profile?.email ?? user.email ?? "" };
  } catch {
    return null;
  }
}
