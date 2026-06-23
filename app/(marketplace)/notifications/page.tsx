import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getAllNotifications } from "@/lib/notifications/queries";
import { NotificationList } from "@/components/marketplace/NotificationList";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Price drops, new arrivals and updates on your activity.",
};

// Always reflect the latest read-state — never serve a cached snapshot.
export const dynamic = "force-dynamic";

/**
 * The full notification-centre page (feature 4). Any signed-in user (buyer,
 * seller or admin) can view their own notifications; requireUser() bounces
 * guests to /signin. Renders the list with per-item + mark-all-read.
 */
export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await getAllNotifications(user.id);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="dnd-container py-14 md:py-20">
      <div className="mx-auto max-w-[680px]">
        <header className="mb-8">
          <p className="eyebrow mb-3">My account</p>
          <h1 className="font-serif text-[34px] leading-tight">Notifications</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {unread > 0
              ? `${unread} unread — price drops, new arrivals from designers you follow, and updates on your activity.`
              : "Price drops, new arrivals from designers you follow, and updates on your activity."}
          </p>
        </header>

        <NotificationList items={items} />
      </div>
    </div>
  );
}
