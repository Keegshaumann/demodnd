import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import {
  getSellerStats,
  getSellerSales,
  getSellerSubmissions,
} from "@/lib/seller/dashboard";
import { formatZar } from "@/lib/money";
import { AUTH_METHOD_LABELS } from "@/lib/marketplace/constants";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { SubmissionStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Seller Dashboard" };

const SUB_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Pending review",
  more_info: "More info needed",
  approved: "Approved",
  declined: "Declined",
};

export default async function SellerOverviewPage() {
  const user = await requireRole("seller");
  const [stats, sales, submissions] = await Promise.all([
    getSellerStats(user.id),
    getSellerSales(user.id),
    getSellerSubmissions(user.id),
  ]);

  const recentSales = sales.slice(0, 5);
  const openSubmissions = submissions
    .filter((s) => s.status === "pending" || s.status === "more_info")
    .slice(0, 5);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Seller</p>
          <h1 className="font-serif text-[34px]">Your dashboard</h1>
        </div>
        <Link href="/sell" className="btn btn-primary">
          List a piece <ArrowRightIcon width={16} height={16} />
        </Link>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active listings" value={String(stats.activeListings)} />
        <Stat label="Pending review" value={String(stats.pendingSubmissions)} />
        <Stat label="Items sold" value={String(stats.itemsSold)} />
        <Stat label="Net earned" value={formatZar(stats.netEarningsCents)} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent sales */}
        <section className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">Recent sales</h2>
            <Link href="/seller/sales" className="text-[12px] text-gold hover:underline">
              View all
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">
              No sales yet. Your approved pieces appear in the marketplace.
            </p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {recentSales.map((s) => (
                <li key={s.orderId} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {s.itemBrand} {s.itemTitle}
                    </div>
                    <div className="text-[12px] text-ink-dim">
                      {new Date(s.createdAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-ink">
                      {formatZar(s.payoutCents)}
                    </div>
                    <div className="text-[11px] text-ink-dim">net payout</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Submissions in progress */}
        <section className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">Submissions in review</h2>
            <Link href="/seller/listings" className="text-[12px] text-gold hover:underline">
              View all
            </Link>
          </div>
          {openSubmissions.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">
              Nothing awaiting review.{" "}
              <Link href="/sell" className="text-gold hover:underline">
                Submit a piece
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {openSubmissions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {s.brand} {s.title}
                    </div>
                    <div className="text-[12px] text-ink-dim">
                      {AUTH_METHOD_LABELS[s.method]}
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-3 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                    {SUB_STATUS_LABEL[s.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
