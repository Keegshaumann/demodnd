import { AnnounceBar } from "@/components/marketplace/AnnounceBar";
import { SiteHeader } from "@/components/marketplace/SiteHeader";
import { SiteFooter } from "@/components/marketplace/SiteFooter";
import { getNavUser } from "@/lib/auth/nav-user";

/**
 * Public marketplace chrome: announcement bar, navigation, footer.
 * Reads the current user (if any) so the nav can show the right CTA.
 */
export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getNavUser();
  return (
    <>
      <AnnounceBar />
      <SiteHeader user={user} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
