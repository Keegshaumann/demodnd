import { requireRole } from "@/lib/auth/guards";

/**
 * Seller area shell. Middleware gates `/seller/*` by role; this layout enforces
 * it again server-side (defense-in-depth). Dashboard chrome arrives in Step 10.
 */
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("seller");
  return <>{children}</>;
}
