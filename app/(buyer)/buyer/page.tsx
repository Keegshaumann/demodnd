import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { getBuyerOrders } from "@/lib/orders/queries";
import { getWishlists, getNotifications } from "@/lib/buyer/queries";
import { BuyerTabs } from "@/components/buyer/BuyerTabs";
import { OrderListItem } from "@/components/buyer/OrderListItem";
import { ArrowRightIcon, HeartIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "My Account" };

export default async function BuyerOverviewPage() {
  const user = await requireRole("buyer");
  const [orders, wishlists, notifications] = await Promise.all([
    getBuyerOrders(user.id),
    getWishlists(user.id),
    getNotifications(user.id),
  ]);

  const inDelivery = orders.filter((o) => o.status === "paid").length;
  const recent = orders.slice(0, 3);
  const alerts = notifications.filter((n) => n.link);

  return (
    <div>
      <header className="mb-2">
        <p className="eyebrow mb-3">My account</p>
        <h1 className="font-serif text-[34px]">Welcome back</h1>
      </header>
      <BuyerTabs />

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="In delivery" value={String(inDelivery)} />
        <Stat label="Wishlist" value={String(wishlists.length)} />
      </div>

      {alerts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-xl">
            <HeartIcon width={18} height={18} className="text-gold" /> Wishlist
            alerts
          </h2>
          <ul className="space-y-2">
            {alerts.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? "/browse"}
                  className="surface-card flex items-center justify-between gap-4 p-4 transition-colors hover:border-gold/20"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="truncate text-[13px] text-ink-muted">
                        {n.body}
                      </div>
                    )}
                  </div>
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className="flex-shrink-0 text-ink-dim"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">Recent orders</h2>
            <Link
              href="/buyer/orders"
              className="text-[12px] text-gold hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="surface-card p-10 text-center text-[13px] text-ink-muted">
              No orders yet.{" "}
              <Link href="/browse" className="text-gold hover:underline">
                Browse the collection
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((o) => (
                <OrderListItem key={o.id} order={o} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">Wishlist</h2>
            <Link
              href="/buyer/wishlist"
              className="text-[12px] text-gold hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="surface-card p-6">
            {wishlists.length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                Add pieces you&apos;re hunting for — we&apos;ll alert you the
                moment a match is authenticated and listed.
              </p>
            ) : (
              <ul className="space-y-2 text-[14px] text-ink-muted">
                {wishlists.slice(0, 5).map((w) => (
                  <li key={w.id} className="flex items-center gap-2">
                    <span className="text-gold">·</span>
                    {w.brand ?? "Any"}
                    {w.keywords && ` — ${w.keywords}`}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/buyer/wishlist"
              className="btn btn-outline btn-sm mt-5 inline-flex"
            >
              Manage wishlist <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1.5 font-serif text-2xl text-ink">{value}</div>
    </div>
  );
}
