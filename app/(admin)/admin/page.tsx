import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAnalytics, type DemandItem } from "@/lib/admin/analytics";
import { formatZar } from "@/lib/money";
import { ArrowRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const now = new Date();
  const monthStartIso = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const a = await getAdminAnalytics(monthStartIso);

  const monthLabel = now.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Overview</p>
        <h1 className="font-serif text-[34px]">Platform analytics</h1>
      </header>

      {/* Revenue */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="GMV · all time"
          value={formatZar(a.gmvAllCents)}
          sub={`${formatZar(a.gmvMonthCents)} in ${monthLabel}`}
        />
        <BigStat
          label="Commission · all time"
          value={formatZar(a.commissionAllCents)}
          sub={`${formatZar(a.commissionMonthCents)} in ${monthLabel}`}
        />
        <BigStat label="Orders" value={String(a.totalOrders)} sub="paid + delivered" />
        <BigStat label="Sellers" value={String(a.sellersCount)} sub="registered" />
      </div>

      {/* Operations */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/submissions"
          className="surface-card flex items-center justify-between p-6 transition-colors hover:border-gold/30"
        >
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
              Pending authentication
            </div>
            <div className="mt-1 font-serif text-3xl text-ink">
              {a.pendingSubmissions}
            </div>
          </div>
          <ArrowRightIcon width={18} height={18} className="text-ink-dim" />
        </Link>
        <Link
          href="/browse"
          className="surface-card flex items-center justify-between p-6 transition-colors hover:border-gold/30"
        >
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
              Active listings
            </div>
            <div className="mt-1 font-serif text-3xl text-ink">
              {a.activeListings}
            </div>
          </div>
          <ArrowRightIcon width={18} height={18} className="text-ink-dim" />
        </Link>
      </div>

      {/* Wishlist demand */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DemandList
          title="Most-wanted brands"
          subtitle="What buyers are searching for"
          items={a.topBrands}
        />
        <DemandList
          title="Most-wanted categories"
          subtitle="Wishlist demand by category"
          items={a.topCategories}
        />
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="surface-card p-6">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1.5 font-serif text-[28px] text-ink">{value}</div>
      <div className="mt-1 text-[12px] text-ink-muted">{sub}</div>
    </div>
  );
}

function DemandList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: DemandItem[];
}) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  return (
    <section className="surface-card p-6">
      <h2 className="font-serif text-xl">{title}</h2>
      <p className="mb-5 text-[12.5px] text-ink-muted">{subtitle}</p>
      {items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-dim">
          No wishlist demand yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.label}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="text-ink">{it.label}</span>
                <span className="text-ink-dim">{it.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-deep">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${Math.round((it.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
