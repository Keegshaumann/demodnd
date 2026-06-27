import { AnnounceBar } from "@/components/marketplace/AnnounceBar";
import { SiteHeader } from "@/components/marketplace/SiteHeader";
import { SiteFooter } from "@/components/marketplace/SiteFooter";
import { GenderGate } from "@/components/marketplace/GenderGate";
import { getNavUser } from "@/lib/auth/nav-user";
import {
  getRecentNotifications,
  getUnreadCount,
} from "@/lib/notifications/queries";

/**
 * Public marketplace chrome: announcement bar, navigation, footer.
 * Reads the current user (if any) so the nav can show the right CTA, and (for
 * signed-in users) the notification-bell badge + recent items so the header
 * renders the bell with no client round-trip.
 */
export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getNavUser();
  const [unreadCount, recentNotifications] = user
    ? await Promise.all([
        getUnreadCount(user.id),
        getRecentNotifications(user.id),
      ])
    : [undefined, undefined];
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to content
      </a>
      <AnnounceBar />
      <SiteHeader
        user={user}
        unreadCount={unreadCount}
        recentNotifications={recentNotifications}
      />
      <main id="main">{children}</main>
      <SiteFooter />
      <GenderGate />
    </>
  );
}
