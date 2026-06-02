import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { getBuyerOrders } from "@/lib/orders/queries";
import { BuyerTabs } from "@/components/buyer/BuyerTabs";
import { OrderListItem } from "@/components/buyer/OrderListItem";

export const metadata: Metadata = { title: "My Orders" };

export default async function BuyerOrdersPage() {
  const user = await requireRole("buyer");
  const orders = await getBuyerOrders(user.id);

  return (
    <div>
      <header className="mb-2">
        <p className="eyebrow mb-3">My account</p>
        <h1 className="font-serif text-[34px]">Order history</h1>
      </header>
      <BuyerTabs />

      {orders.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          You haven&apos;t purchased anything yet.{" "}
          <Link href="/browse" className="text-gold hover:underline">
            Browse the collection
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderListItem key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
