import { requireRole } from "@/lib/auth/guards";
import { AnnounceBar } from "@/components/marketplace/AnnounceBar";
import { SiteHeader } from "@/components/marketplace/SiteHeader";
import { SiteFooter } from "@/components/marketplace/SiteFooter";
import {
  getRecentNotifications,
  getUnreadCount,
} from "@/lib/notifications/queries";

/**
 * Buyer area shell. Middleware gates `/buyer/*` by role; this layout enforces it
 * again server-side (defense-in-depth) and renders the site chrome (buyers are
 * shoppers) — including the notification bell hydrated from the buyer's own
 * unread count + recent items.
 */
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("buyer");
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(user.id),
    getRecentNotifications(user.id),
  ]);
  return (
    <>
      <AnnounceBar />
      <SiteHeader
        user={{ id: user.id, role: user.role, email: user.email }}
        unreadCount={unreadCount}
        recentNotifications={recentNotifications}
      />
      <main className="dnd-container py-12">{children}</main>
      <SiteFooter />
    </>
  );
}
