import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getSellerSales } from "@/lib/seller/dashboard";
import { formatZar } from "@/lib/money";
import { StarFilledIcon } from "@/components/ui/icons";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Sales" };

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "border-amber-300 text-amber-700",
  paid: "border-blue-300 text-blue-700",
  delivered: "border-emerald-300 text-emerald-700",
  refunded: "border-rose-300 text-rose-700",
  disputed: "border-rose-300 text-rose-700",
};

export default async function SellerSalesPage() {
  const user = await requireRole("seller");
  const sales = await getSellerSales(user.id);

  const totalNet = sales
    .filter((s) => s.status === "paid" || s.status === "delivered")
    .reduce((a, s) => a + s.payoutCents, 0);

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Earnings</p>
        <h1 className="font-serif text-[34px]">Sales &amp; payouts</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your net payout is the sale price less D&amp;D&apos;s commission. D&amp;D
          settles via EFT to your registered banking details once delivery is
          confirmed.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total sales" value={String(sales.length)} />
        <Stat label="Net earned" value={formatZar(totalNet)} />
      </div>

      {sales.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          No sales yet.
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((s) => (
            <article key={s.orderId} className="surface-card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-lg">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-gold">
                      {s.itemBrand}
                    </span>{" "}
                    {s.itemTitle}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${STATUS_CLASS[s.status]}`}
                  >
                    {s.status}
                  </span>
                </div>
                <span className="text-[12px] text-ink-dim">
                  {new Date(s.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Amount label="Sale price" value={formatZar(s.grossCents)} />
                <Amount
                  label="Commission"
                  value={`− ${formatZar(s.commissionCents)}`}
                  muted
                />
                <Amount label="Net payout" value={formatZar(s.payoutCents)} strong />
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
                    Buyer rating
                  </div>
                  <div className="mt-1">
                    {s.rating ? (
                      <span className="inline-flex items-center gap-1 text-gold">
                        <StarFilledIcon width={14} height={14} />
                        <span className="text-sm text-ink">{s.rating}.0</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-ink-dim">—</span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
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

function Amount({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div
        className={`mt-1 ${strong ? "font-serif text-xl text-ink" : muted ? "text-sm text-ink-muted" : "text-sm text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
