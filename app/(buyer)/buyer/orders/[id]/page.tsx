import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getOrderForBuyer } from "@/lib/orders/queries";
import { getDisputeForOrder } from "@/lib/disputes/queries";
import { disputeWindowEndsAt } from "@/lib/disputes/window";
import { formatZar } from "@/lib/money";
import { categoryLabel, processBadgeLabel } from "@/lib/marketplace/constants";
import { ConfirmReceiptButton } from "@/components/buyer/ConfirmReceiptButton";
import { RaiseDisputeForm } from "@/components/buyer/RaiseDisputeForm";
import {
  CertificateIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  TruckIcon,
  ClockIcon,
} from "@/components/ui/icons";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Order" };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid · preparing delivery",
  delivered: "Delivered",
  refunded: "Refunded",
  disputed: "In dispute",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "border-amber-300 text-amber-700",
  paid: "border-blue-300 text-blue-700",
  delivered: "border-emerald-300 text-emerald-700",
  refunded: "border-rose-300 text-rose-700",
  disputed: "border-rose-300 text-rose-700",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // BUY-6: consistent with the buyer-only area this page lives under (the order
  // views are buyer-scoped; checkout is now buyer-only too — see BUY-1).
  const user = await requireRole("buyer");
  const detail = await getOrderForBuyer(id, user.id);
  if (!detail) notFound();

  const { order, item } = detail;
  const paidDone = !!order.paid_at;
  const deliveredDone = !!order.delivered_at;

  // Dispute context for the help card. RLS only returns disputes this buyer
  // raised — a seller-raised dispute falls back to the generic status branch.
  const dispute = await getDisputeForOrder(order.id);
  const windowEnd = order.delivered_at
    ? disputeWindowEndsAt(order.delivered_at)
    : null;
  const withinWindow = !!windowEnd && Date.now() <= windowEnd.getTime();
  const canRaise = order.status === "delivered" && withinWindow && !dispute;

  return (
    <div>
      <nav className="mb-8 flex items-center gap-2 text-[12px] text-ink-dim">
        <Link href="/buyer" className="hover:text-ink">
          My account
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <Link href="/buyer/orders" className="hover:text-ink">
          Orders
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <span className="text-ink-muted">
          #{order.id.slice(0, 8).toUpperCase()}
        </span>
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow mb-3">Order</div>
          <h1 className="font-serif text-[32px]">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Placed {fmtDate(order.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full border px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] ${STATUS_CLASS[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: item + timeline */}
        <div className="space-y-8">
          <div className="surface-card flex gap-5 p-5">
            <div className="relative h-32 w-28 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={`${item.brand} ${item.title}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-dim">
                  <CertificateIcon width={26} height={26} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] uppercase tracking-[0.24em] text-gold">
                {item.brand}
              </div>
              <Link
                href={`/listing/${item.listingId}`}
                className="font-serif text-2xl hover:text-gold"
              >
                {item.title}
              </Link>
              <div className="mt-1 text-[12.5px] text-ink-dim">
                {categoryLabel(item.category)}
                {item.condition && ` · ${item.condition}`}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                <CertificateIcon width={11} height={11} />
                {processBadgeLabel(item.category)} by D&D
              </div>
              {/* ANON: buyers never see seller identity — the D&D
                  authentication/evaluation guarantee carries trust instead. */}
              <div className="mt-2 text-[12.5px] text-ink-muted">
                Sold by a Verified Seller via D&amp;D Luxury
              </div>
            </div>
          </div>

          {/* Delivery timeline */}
          <div className="surface-card p-6">
            <h3 className="mb-5 font-serif text-xl">Delivery status</h3>
            <ol className="space-y-5">
              <TimelineStep
                done={paidDone}
                icon={CheckCircleIcon}
                title="Payment received"
                detail={fmtDate(order.paid_at)}
              />
              <TimelineStep
                done={deliveredDone}
                active={paidDone && !deliveredDone}
                icon={TruckIcon}
                title={deliveredDone ? "Delivered" : "Out for white-glove delivery"}
                detail={
                  deliveredDone
                    ? fmtDate(order.delivered_at)
                    : "D&D Luxury will arrange delivery and keep you updated."
                }
              />
            </ol>

            {order.status === "paid" && (
              <div className="mt-6 border-t border-border-soft pt-5">
                <ConfirmReceiptButton orderId={order.id} />
              </div>
            )}
            {order.status === "delivered" && (
              <div className="mt-6 flex items-center gap-2 border-t border-border-soft pt-5 text-[13px] text-emerald-700">
                <CheckCircleIcon width={16} height={16} /> Receipt confirmed —
                thank you.
              </div>
            )}
          </div>
        </div>

        {/* Right: summary + support */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="surface-card p-6">
            <h3 className="mb-4 font-serif text-xl">Payment</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <dt>Item</dt>
                <dd className="text-ink">{formatZar(order.gross_amount_cents)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>White-glove delivery</dt>
                <dd className="text-ink">Included</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border-soft pt-3">
                <dt className="font-medium">Total paid</dt>
                <dd className="font-serif text-2xl text-silver">
                  {formatZar(order.gross_amount_cents)}
                </dd>
              </div>
            </dl>
          </div>

          {order.shipping_address && (
            <div className="surface-card p-6">
              <h3 className="mb-3 font-serif text-xl">Delivery address</h3>
              <p className="text-[13.5px] leading-relaxed text-ink-muted">
                {order.shipping_name && (
                  <>
                    <span className="text-ink">{order.shipping_name}</span>
                    <br />
                  </>
                )}
                {order.shipping_address}
              </p>
            </div>
          )}

          <div className="surface-card p-6">
            <h3 className="mb-2 flex items-center gap-2 font-serif text-xl">
              <ClockIcon width={16} height={16} className="text-gold" /> Need help?
            </h3>
            {dispute ? (
              <>
                <div className="rounded-[3px] border border-border-soft bg-bg p-3">
                  {dispute.status === "resolved" ? (
                    <>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
                        Resolution
                      </div>
                      <p className="mt-1 text-[13px] text-ink">
                        {dispute.resolution ??
                          "Our team has resolved this dispute."}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-dim">
                        Resolved {fmtDate(dispute.resolved_at)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
                        Dispute open
                      </div>
                      <p className="mt-1 text-[13px] text-ink-muted">
                        Raised {fmtDate(dispute.created_at)}. Our team is
                        reviewing and will be in touch.
                      </p>
                    </>
                  )}
                </div>
                <div className="mt-4">
                  <Link
                    href="/concierge"
                    className="btn btn-outline btn-sm btn-block"
                  >
                    Speak to our concierge
                  </Link>
                </div>
              </>
            ) : order.status === "disputed" ? (
              <>
                <p className="mb-4 text-[13px] text-ink-muted">
                  This order is in dispute. Our team is reviewing.
                </p>
                <Link
                  href="/concierge"
                  className="btn btn-outline btn-sm btn-block"
                >
                  Speak to our concierge
                </Link>
              </>
            ) : canRaise && windowEnd ? (
              <>
                <p className="mb-3 text-[13px] text-ink-muted">
                  Something wrong with your order? D&amp;D Luxury handles every
                  issue personally — including refunds where warranted.
                </p>
                <p className="mb-4 text-[13px] text-ink-muted">
                  You can raise a dispute within 48 hours of delivery — until{" "}
                  {fmtDateTime(windowEnd)}.
                </p>
                <RaiseDisputeForm
                  orderId={order.id}
                  deadlineLabel={fmtDateTime(windowEnd)}
                />
                <p className="mt-3 text-center text-[12px] text-ink-dim">
                  or{" "}
                  <Link href="/concierge" className="hover:text-ink">
                    speak to our concierge
                  </Link>
                </p>
              </>
            ) : order.status === "delivered" ? (
              <>
                <p className="mb-4 text-[13px] text-ink-muted">
                  The 48-hour dispute window for this order closed
                  {windowEnd ? ` on ${fmtDateTime(windowEnd)}` : ""}. Our
                  concierge can still help with anything.
                </p>
                <Link
                  href="/concierge"
                  className="btn btn-outline btn-sm btn-block"
                >
                  Report a problem
                </Link>
              </>
            ) : (
              <>
                <p className="mb-4 text-[13px] text-ink-muted">
                  Something wrong with your order? D&amp;D Luxury handles every
                  issue personally — including refunds where warranted.
                </p>
                <Link
                  href="/concierge"
                  className="btn btn-outline btn-sm btn-block"
                >
                  Report a problem
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  done,
  active,
  icon: Icon,
  title,
  detail,
}: {
  done: boolean;
  active?: boolean;
  icon: (props: { width?: number; height?: number; className?: string }) => React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex gap-4">
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-gold bg-gold text-white"
            : active
              ? "border-gold text-gold"
              : "border-border text-ink-dim"
        }`}
      >
        <Icon width={16} height={16} />
      </span>
      <div className="pt-1">
        <div className={`text-sm font-medium ${done || active ? "text-ink" : "text-ink-dim"}`}>
          {title}
        </div>
        <div className="text-[12.5px] text-ink-muted">{detail}</div>
      </div>
    </li>
  );
}
