import { requireRole } from "@/lib/auth/guards";
import { AnnounceBar } from "@/components/marketplace/AnnounceBar";
import { SiteHeader } from "@/components/marketplace/SiteHeader";
import { SiteFooter } from "@/components/marketplace/SiteFooter";

/**
 * Buyer area shell. Middleware gates `/buyer/*` by role; this layout enforces it
 * again server-side (defense-in-depth) and renders the site chrome (buyers are
 * shoppers).
 */
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("buyer");
  return (
    <>
      <AnnounceBar />
      <SiteHeader user={{ role: user.role, email: user.email }} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
