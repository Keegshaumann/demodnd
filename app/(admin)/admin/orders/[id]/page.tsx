import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/admin/orders";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatZar, formatBps } from "@/lib/money";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Order" };

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "border-amber-300 text-amber-700",
  paid: "border-blue-300 text-blue-700",
  delivered: "border-emerald-300 text-emerald-700",
  refunded: "border-rose-300 text-rose-700",
  disputed: "border-rose-300 text-rose-700",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-[12px] text-ink-dim">
        <Link href="/admin/orders" className="hover:text-ink">
          Sales ledger
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <span className="text-ink-muted">#{order.id.slice(0, 8).toUpperCase()}</span>
      </nav>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Order</p>
          <h1 className="font-serif text-[30px]">
            {order.itemBrand} {order.itemTitle}
          </h1>
        </div>
        <span
          className={`rounded-full border px-3 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] ${STATUS_CLASS[order.status]}`}
        >
          {order.status}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="eyebrow mb-4">Amounts</h2>
          <dl className="space-y-2 text-[14px]">
            <Row label="Gross" value={formatZar(order.grossCents)} />
            <Row
              label={`Commission (${formatBps(order.feeRateBps)})`}
              value={formatZar(order.commissionCents)}
            />
            <div className="flex justify-between border-t border-border-soft pt-2 font-medium">
              <dt>Seller payout</dt>
              <dd>{formatZar(order.payoutCents)}</dd>
            </div>
          </dl>
          <dl className="mt-4 space-y-1 border-t border-border-soft pt-4 text-[12.5px] text-ink-muted">
            <Row label="Ordered" value={fmtDate(order.createdAt)} />
            <Row label="Paid" value={fmtDate(order.paidAt)} />
            <Row label="Delivered" value={fmtDate(order.deliveredAt)} />
          </dl>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow mb-4">Buyer &amp; delivery</h2>
          <div className="text-[13px]">
            <div className="text-ink">{order.buyerName ?? order.buyerEmail}</div>
            <div className="text-ink-muted">{order.buyerEmail}</div>
          </div>
          <div className="mt-3 rounded-[3px] border border-border-soft bg-bg p-3 text-[13px]">
            <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
              Ship to
            </div>
            <div className="mt-1 text-ink">{order.shippingName ?? "—"}</div>
            <div className="whitespace-pre-line text-ink-muted">
              {order.shippingAddress ?? "—"}
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow mb-4">Seller payout (EFT)</h2>
          <div className="text-[13px] font-medium text-ink">{order.sellerName}</div>
          <div className="text-[12.5px] text-ink-muted">{order.sellerEmail}</div>
          <dl className="mt-2 space-y-0.5 text-[12.5px] text-ink-muted">
            <BankLine label="Bank" value={order.bank.name} />
            <BankLine label="Account" value={order.bank.accountNumber} />
            <BankLine label="Branch" value={order.bank.branchCode} />
            <BankLine label="Holder" value={order.bank.accountHolder} />
          </dl>
          {!order.bank.accountNumber && (
            <p className="mt-2 text-[11.5px] text-amber-700">
              No banking details on file — request from seller.
            </p>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow mb-4">Actions</h2>
          <OrderActions orderId={order.id} status={order.status} />
          <p className="mt-4 text-[12px] text-ink-dim">
            <Link
              href={`/listing/${order.listingId}`}
              className="underline hover:text-gold"
            >
              View the listing
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-dim">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function BankLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-16 flex-shrink-0 text-ink-dim">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
