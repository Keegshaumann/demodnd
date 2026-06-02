import Link from "next/link";
import Image from "next/image";
import { formatZar } from "@/lib/money";
import { CertificateIcon } from "@/components/ui/icons";
import type { BuyerOrderRow } from "@/lib/orders/queries";
import type { OrderStatus } from "@/lib/supabase/database.types";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "border-amber-300 text-amber-700" },
  paid: { label: "In delivery", cls: "border-blue-300 text-blue-700" },
  delivered: { label: "Delivered", cls: "border-emerald-300 text-emerald-700" },
  refunded: { label: "Refunded", cls: "border-rose-300 text-rose-700" },
  disputed: { label: "In dispute", cls: "border-rose-300 text-rose-700" },
};

export function OrderListItem({ order }: { order: BuyerOrderRow }) {
  return (
    <Link
      href={`/buyer/orders/${order.id}`}
      className="surface-card flex items-center gap-5 p-4 transition-colors hover:border-gold/20"
    >
      <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
        {order.imageUrl ? (
          <Image
            src={order.imageUrl}
            alt={`${order.brand} ${order.title}`}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-dim">
            <CertificateIcon width={20} height={20} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
          {order.brand}
        </div>
        <div className="truncate font-serif text-lg">{order.title}</div>
        <div className="text-[12px] text-ink-dim">
          {new Date(order.createdAt).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · #{order.id.slice(0, 8).toUpperCase()}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="font-serif text-lg">{formatZar(order.grossCents)}</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] ${STATUS[order.status].cls}`}
        >
          {STATUS[order.status].label}
        </span>
      </div>
    </Link>
  );
}
