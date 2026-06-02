import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ensureSellerProfile } from "@/lib/seller/profile";
import { SellerShell } from "@/components/seller/SellerShell";

/**
 * Seller area shell. Middleware gates `/seller/*` by role; this layout enforces
 * it again server-side (defense-in-depth), guarantees a seller_profiles row
 * exists, and renders the dashboard chrome.
 */
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("seller");
  const supabase = await createClient();
  await ensureSellerProfile(supabase, user);
  return <SellerShell email={user.email}>{children}</SellerShell>;
}
