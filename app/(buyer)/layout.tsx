import { requireRole } from "@/lib/auth/guards";

/**
 * Buyer area shell. Middleware gates `/buyer/*` by role; this layout enforces it
 * again server-side (defense-in-depth). Dashboard chrome arrives in Step 11.
 */
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("buyer");
  return <>{children}</>;
}
